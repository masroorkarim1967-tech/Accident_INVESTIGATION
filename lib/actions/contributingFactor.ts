"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { contributingFactorSchema } from "@/lib/validation/contributingFactor";
import { suggestContributingFactors, type ContributingFactorSuggestion } from "@/lib/services/suggestContributingFactor";
import { UserRole, InvestigationStatus } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type ContributingFactorActionState = { error: string | null; fieldErrors?: Record<string, string> };

function mapEditAccessError(error: unknown): ContributingFactorActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-031 — Add/Edit Contributing Factor. factorId omitted (or null) means "add new". */
export async function saveContributingFactorAction(
  investigationId: number,
  factorId: number | null,
  _prevState: ContributingFactorActionState,
  formData: FormData,
): Promise<ContributingFactorActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = contributingFactorSchema.safeParse({
    description: formData.get("description"),
    category: formData.get("category"),
    hazardIds: formData.getAll("hazardIds"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  // FR-031's validation rule: linked hazards, if any, must belong to the
  // same investigation — checked server-side, not just a client-side
  // filtered picker.
  if (parsed.data.hazardIds.length > 0) {
    const ownedCount = await db.hazard.count({
      where: { id: { in: parsed.data.hazardIds }, investigationId },
    });
    if (ownedCount !== parsed.data.hazardIds.length) {
      return { error: "One or more selected hazards do not belong to this investigation." };
    }
  }

  const data = { description: parsed.data.description, category: parsed.data.category };

  await db.$transaction(async (tx) => {
    const factor = factorId
      ? await tx.contributingFactor.update({ where: { id: factorId }, data })
      : await tx.contributingFactor.create({ data: { investigationId, ...data } });

    // Delete-and-recreate the link set — simplest way to keep it in sync
    // with whatever the checkbox picker submitted, atomically.
    await tx.contributingFactorHazardLink.deleteMany({ where: { contributingFactorId: factor.id } });
    if (parsed.data.hazardIds.length > 0) {
      await tx.contributingFactorHazardLink.createMany({
        data: parsed.data.hazardIds.map((hazardId) => ({ contributingFactorId: factor.id, hazardId })),
      });
    }
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-032 — Remove Contributing Factor. Hazard links and any
 *  RootCauseContributingFactorLink rows cascade-delete with it (link
 *  removed, the linked root cause itself is untouched).
 */
export async function removeContributingFactorAction(
  investigationId: number,
  factorId: number,
): Promise<ContributingFactorActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  await db.contributingFactor.delete({ where: { id: factorId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/**
 * FR-033 — Generate Potential Contributing Factors (Investigation
 * Support). Read-only: never persists anything itself, and the DB query
 * itself lives here rather than in the pure similarity service
 * (lib/services/suggestContributingFactor.ts), matching
 * generateClassificationSuggestionAction's split (occurrence.ts).
 */
export async function generateContributingFactorSuggestionsAction(
  investigationId: number,
): Promise<{ suggestions: ContributingFactorSuggestion[]; error: string | null }> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return { suggestions: [], error: mapped.error };
    throw error;
  }

  const occurrence = await db.occurrence.findUnique({ where: { investigationId } });
  if (!occurrence?.narrativeDescription) {
    return { suggestions: [], error: "Record a Narrative Description before requesting suggestions." };
  }

  const closedInvestigations = await db.investigation.findMany({
    where: { status: InvestigationStatus.Closed, id: { not: investigationId } },
    select: {
      referenceNumber: true,
      occurrence: { select: { narrativeDescription: true } },
      contributingFactors: { select: { description: true, category: true } },
    },
    // assistance-engine.md §4's performance note: bounded scan, not the
    // whole portfolio — most-recently-updated closed investigations first.
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const candidates = closedInvestigations
    .filter((inv) => inv.occurrence?.narrativeDescription)
    .map((inv) => ({
      referenceNumber: inv.referenceNumber,
      narrativeDescription: inv.occurrence!.narrativeDescription!,
      factors: inv.contributingFactors,
    }));

  const suggestions = suggestContributingFactors(occurrence.narrativeDescription, candidates);
  return { suggestions, error: null };
}
