"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { hazardSchema, hazardResidualRiskSchema } from "@/lib/validation/hazard";
import { calculateRiskScore, resolveRiskBand } from "@/lib/services/riskEngine";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type HazardActionState = { error: string | null; fieldErrors?: Record<string, string>; warning?: string | null };

function mapEditAccessError(error: unknown): HazardActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-029 — Add/Edit Hazard (Description, Category, Initial Risk). hazardId omitted (or null) means "add new". */
export async function saveHazardAction(
  investigationId: number,
  hazardId: number | null,
  _prevState: HazardActionState,
  formData: FormData,
): Promise<HazardActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = hazardSchema.safeParse({
    description: formData.get("description"),
    hazardCategory: formData.get("hazardCategory"),
    initialLikelihood: formData.get("initialLikelihood"),
    initialSeverity: formData.get("initialSeverity"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  // FR-029 Edge Cases: changing Initial Likelihood/Severity on an existing
  // hazard recomputes initialRiskScore/initialRiskBand immediately — the
  // same live-recompute-on-save pattern as Occurrence's Outcome tab.
  const initialRiskScore = calculateRiskScore(parsed.data.initialLikelihood, parsed.data.initialSeverity);
  const { bandLabel } = await resolveRiskBand(initialRiskScore);

  const data = {
    description: parsed.data.description,
    hazardCategory: parsed.data.hazardCategory,
    initialLikelihood: parsed.data.initialLikelihood,
    initialSeverity: parsed.data.initialSeverity,
    initialRiskScore,
    initialRiskBand: bandLabel,
  };

  if (hazardId) {
    await db.hazard.update({ where: { id: hazardId }, data });
  } else {
    await db.hazard.create({ data: { investigationId, ...data } });
  }

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/**
 * FR-068 — Existing Controls and Residual Risk, saved independently of
 * FR-029's core fields (a hazard is valid with Initial Risk alone). A
 * residual score higher than the initial score still saves successfully
 * but returns a non-blocking `warning` for the form to display inline.
 */
export async function saveHazardResidualRiskAction(
  investigationId: number,
  hazardId: number,
  _prevState: HazardActionState,
  formData: FormData,
): Promise<HazardActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = hazardResidualRiskSchema.safeParse({
    existingControls: formData.get("existingControls"),
    residualLikelihood: formData.get("residualLikelihood") || undefined,
    residualSeverity: formData.get("residualSeverity") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const hazard = await db.hazard.findUnique({ where: { id: hazardId } });
  if (!hazard) {
    return { error: "Hazard not found." };
  }

  const { residualLikelihood, residualSeverity } = parsed.data;
  let residualRiskScore: number | null = null;
  let residualRiskBand: string | null = null;
  let warning: string | null = null;

  if (residualLikelihood && residualSeverity) {
    residualRiskScore = calculateRiskScore(residualLikelihood, residualSeverity);
    residualRiskBand = (await resolveRiskBand(residualRiskScore)).bandLabel;
    if (residualRiskScore > hazard.initialRiskScore) {
      warning = "Residual risk is higher than initial risk — please confirm this is intentional.";
    }
  }

  await db.hazard.update({
    where: { id: hazardId },
    data: {
      existingControls: parsed.data.existingControls || null,
      residualLikelihood: residualLikelihood || null,
      residualSeverity: residualSeverity || null,
      residualRiskScore,
      residualRiskBand,
    },
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null, warning };
}

/** FR-030 — Remove Hazard. Linked ContributingFactorHazardLink/CorrectiveAction/PreventiveAction
 *  rows (once those phases exist) are unlinked via their own onDelete rules, not a cascading
 *  delete of the linked record — see data-model.md §7's cascade table.
 */
export async function removeHazardAction(investigationId: number, hazardId: number): Promise<HazardActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  await db.hazard.delete({ where: { id: hazardId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
