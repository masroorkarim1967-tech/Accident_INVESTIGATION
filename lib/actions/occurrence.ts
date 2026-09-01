"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import {
  occurrenceNarrativeSchema,
  occurrenceClassificationSchema,
  occurrenceOutcomeSchema,
  occurrenceOverrideSchema,
} from "@/lib/validation/occurrence";
import { suggestClassification, type ClassificationSuggestion } from "@/lib/services/investigationSupportEngine/suggestClassification";
import { calculateRiskScore, resolveRiskBand, resolveInvestigationPriority, moreSevere } from "@/lib/services/riskEngine";
import { checkAndAdvanceStage } from "@/lib/services/stageTransition";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type OccurrenceActionState = { error: string | null; fieldErrors?: Record<string, string> };

function mapEditAccessError(error: unknown): OccurrenceActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-012 — Narrative tab. */
export async function saveOccurrenceNarrativeAction(
  investigationId: number,
  _prevState: OccurrenceActionState,
  formData: FormData,
): Promise<OccurrenceActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const raw = {
    occurrenceDate: String(formData.get("occurrenceDate") ?? ""),
    occurrenceTimeUtc: String(formData.get("occurrenceTimeUtc") ?? ""),
    occurrenceTimeLocal: String(formData.get("occurrenceTimeLocal") ?? ""),
    phaseOfFlight: String(formData.get("phaseOfFlight") ?? ""),
    briefDescription: String(formData.get("briefDescription") ?? ""),
    narrativeDescription: String(formData.get("narrativeDescription") ?? ""),
  };

  const parsed = occurrenceNarrativeSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const { occurrenceDate, occurrenceTimeUtc, occurrenceTimeLocal, phaseOfFlight, briefDescription, narrativeDescription } =
    parsed.data;

  await db.occurrence.update({
    where: { investigationId },
    data: {
      occurrenceDateUtc: new Date(occurrenceDate),
      occurrenceTimeUtc: new Date(`1970-01-01T${occurrenceTimeUtc}Z`),
      occurrenceTimeLocal: occurrenceTimeLocal ? new Date(`1970-01-01T${occurrenceTimeLocal}Z`) : null,
      phaseOfFlight,
      briefDescription,
      narrativeDescription,
    },
  });

  // Draft -> Open gate (investigation-workflow.md §8) needs this plus an
  // assigned Investigator — no-ops until both are true.
  await checkAndAdvanceStage(investigationId, user.id);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-028 — Generate Suggested Classification. Not persisted until accepted. */
export async function generateClassificationSuggestionAction(
  investigationId: number,
): Promise<{ suggestion: ClassificationSuggestion | null; error: string | null }> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return { suggestion: null, error: mapped.error };
    throw error;
  }

  const occurrence = await db.occurrence.findUnique({ where: { investigationId } });
  if (!occurrence?.narrativeDescription) {
    return { suggestion: null, error: "Record a Narrative Description before requesting a suggestion." };
  }

  const suggestion = suggestClassification(occurrence.narrativeDescription);

  if (suggestion) {
    const subcategoryRow = await db.occurrenceSubcategoryOption.findFirst({
      where: { category: suggestion.category, subcategory: suggestion.subcategory },
    });
    await db.occurrence.update({
      where: { investigationId },
      data: {
        suggestedCategory: suggestion.category,
        suggestedSubcategoryId: subcategoryRow?.id,
      },
    });
  }

  return { suggestion, error: null };
}

/** FR-027 — Classification tab (accept-suggestion or manual entry both land here). */
export async function saveOccurrenceClassificationAction(
  investigationId: number,
  acceptedSuggestion: boolean,
  _prevState: OccurrenceActionState,
  formData: FormData,
): Promise<OccurrenceActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = occurrenceClassificationSchema.safeParse({
    occurrenceCategory: formData.get("occurrenceCategory"),
    occurrenceSubcategoryId: formData.get("occurrenceSubcategoryId"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  // data-model.md §3.3.1 invariant: the subcategory's own category must
  // match the selected category — enforced server-side even though the
  // UI's dependent picker shouldn't allow reaching this state.
  const subcategory = await db.occurrenceSubcategoryOption.findUnique({
    where: { id: parsed.data.occurrenceSubcategoryId },
  });
  if (!subcategory || subcategory.category !== parsed.data.occurrenceCategory) {
    return { error: "Selected subcategory does not belong to the selected category." };
  }

  const current = await db.occurrence.findUniqueOrThrow({ where: { investigationId } });

  await db.occurrence.update({
    where: { investigationId },
    data: {
      occurrenceCategory: parsed.data.occurrenceCategory,
      occurrenceSubcategoryId: parsed.data.occurrenceSubcategoryId,
      classifiedByUserId: user.id,
      classifiedAt: new Date(),
      wasSuggestionAccepted:
        current.suggestedCategory === parsed.data.occurrenceCategory &&
        current.suggestedSubcategoryId === parsed.data.occurrenceSubcategoryId
          ? acceptedSuggestion
          : false,
    },
  });

  // Open -> UnderInvestigation gate also needs Actual/Potential Outcome +
  // Likelihood (saveOccurrenceOutcomeAction below) — no-ops until both saves land.
  await checkAndAdvanceStage(investigationId, user.id);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-066/FR-067 — Actual/Potential Outcome; recomputes Severity, Risk Score/Band, Investigation Priority. */
export async function saveOccurrenceOutcomeAction(
  investigationId: number,
  _prevState: OccurrenceActionState,
  formData: FormData,
): Promise<OccurrenceActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = occurrenceOutcomeSchema.safeParse({
    actualOutcomeSeverity: formData.get("actualOutcomeSeverity"),
    actualOutcomeDescription: formData.get("actualOutcomeDescription"),
    potentialOutcomeSeverity: formData.get("potentialOutcomeSeverity"),
    potentialOutcomeDescription: formData.get("potentialOutcomeDescription"),
    likelihoodOfRecurrence: formData.get("likelihoodOfRecurrence"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const { actualOutcomeSeverity, potentialOutcomeSeverity, likelihoodOfRecurrence } = parsed.data;
  const current = await db.occurrence.findUniqueOrThrow({ where: { investigationId } });

  // §6.5: severity/priority are computed by default, directly overridable —
  // a prior manual override is preserved unless the investigator clears it
  // by re-saving Outcome, which is treated as accepting fresh computed
  // values again (the override applied to the old computation, not this one).
  const computedSeverity = moreSevere(actualOutcomeSeverity, potentialOutcomeSeverity);
  const riskScore = calculateRiskScore(likelihoodOfRecurrence, potentialOutcomeSeverity);
  const { bandLabel } = await resolveRiskBand(riskScore);
  const computedPriority = resolveInvestigationPriority(computedSeverity, bandLabel, current.occurrenceCategory);

  await db.occurrence.update({
    where: { investigationId },
    data: {
      ...parsed.data,
      severity: computedSeverity,
      severityOverridden: false,
      severityOverrideJustification: null,
      riskScore,
      riskBand: bandLabel,
      investigationPriority: computedPriority,
      priorityOverridden: false,
      priorityOverrideJustification: null,
    },
  });

  await checkAndAdvanceStage(investigationId, user.id);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-067 — manual override of computed Severity or Investigation Priority, with required justification. */
export async function overrideOccurrenceFieldAction(
  investigationId: number,
  _prevState: OccurrenceActionState,
  formData: FormData,
): Promise<OccurrenceActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = occurrenceOverrideSchema.safeParse({
    field: formData.get("field"),
    justification: formData.get("justification"),
    severityValue: formData.get("severityValue") || undefined,
    priorityValue: formData.get("priorityValue") || undefined,
  });
  if (!parsed.success) {
    return { error: "A justification of at least 20 characters is required to override." };
  }

  if (parsed.data.field === "severity" && parsed.data.severityValue) {
    await db.occurrence.update({
      where: { investigationId },
      data: {
        severity: parsed.data.severityValue,
        severityOverridden: true,
        severityOverrideJustification: parsed.data.justification,
      },
    });
  } else if (parsed.data.field === "investigationPriority" && parsed.data.priorityValue) {
    await db.occurrence.update({
      where: { investigationId },
      data: {
        investigationPriority: parsed.data.priorityValue,
        priorityOverridden: true,
        priorityOverrideJustification: parsed.data.justification,
      },
    });
  } else {
    return { error: "A value to override with is required." };
  }

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-016 edge case — "No persons were involved" toggle, mutually exclusive with recording persons. */
export async function toggleNoPersonsInvolvedAction(investigationId: number, confirmed: boolean): Promise<OccurrenceActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  if (confirmed) {
    const existingCount = await db.person.count({ where: { investigationId } });
    if (existingCount > 0) {
      return { error: "Remove all recorded persons before confirming none were involved." };
    }
  }

  await db.occurrence.update({ where: { investigationId }, data: { noPersonsInvolvedConfirmed: confirmed } });
  await checkAndAdvanceStage(investigationId, user.id);
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
