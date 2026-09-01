"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { fiveWhysAnalysisSchema, fiveWhysEntrySchema } from "@/lib/validation/fiveWhys";
import { suggestFollowUpQuestion, type FollowUpSuggestion } from "@/lib/services/investigationSupportEngine/suggestFollowUpQuestion";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];
const MAX_ENTRIES = 5;

export type FiveWhysActionState = { error: string | null; fieldErrors?: Record<string, string> };

function mapEditAccessError(error: unknown): FiveWhysActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-034 — Start New 5 Whys Analysis. */
export async function startFiveWhysAnalysisAction(
  investigationId: number,
  _prevState: FiveWhysActionState,
  formData: FormData,
): Promise<FiveWhysActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = fiveWhysAnalysisSchema.safeParse({ problemStatement: formData.get("problemStatement") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  await db.fiveWhysAnalysis.create({
    data: { investigationId, problemStatement: parsed.data.problemStatement, createdByUserId: user.id },
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/**
 * FR-035 — Add/Edit Why Entry. entryId omitted (or null) means "append a
 * new entry" — its sequenceNumber is auto-assigned as the next in order,
 * never user input. FR-035's Edge Case: a 6th entry on a single analysis
 * is blocked (data-model.md §3.16's hard 5-entry cap).
 */
export async function saveWhyEntryAction(
  investigationId: number,
  analysisId: number,
  entryId: number | null,
  _prevState: FiveWhysActionState,
  formData: FormData,
): Promise<FiveWhysActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = fiveWhysEntrySchema.safeParse({ question: formData.get("question"), answer: formData.get("answer") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  if (entryId) {
    await db.fiveWhysEntry.update({ where: { id: entryId }, data: parsed.data });
  } else {
    const existingCount = await db.fiveWhysEntry.count({ where: { fiveWhysAnalysisId: analysisId } });
    if (existingCount >= MAX_ENTRIES) {
      return {
        error:
          "This analysis already has 5 Why entries, the maximum. Conclude it with a Root Cause, or start a second, more specific 5 Whys branch.",
      };
    }
    await db.fiveWhysEntry.create({
      data: { fiveWhysAnalysisId: analysisId, sequenceNumber: existingCount + 1, ...parsed.data },
    });
  }

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-037 (entry half) — Remove Why Entry. Remaining entries are renumbered to stay contiguous from 1. */
export async function removeWhyEntryAction(
  investigationId: number,
  analysisId: number,
  entryId: number,
): Promise<FiveWhysActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  await db.$transaction(async (tx) => {
    await tx.fiveWhysEntry.delete({ where: { id: entryId } });
    const remaining = await tx.fiveWhysEntry.findMany({
      where: { fiveWhysAnalysisId: analysisId },
      orderBy: { sequenceNumber: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].sequenceNumber !== i + 1) {
        await tx.fiveWhysEntry.update({ where: { id: remaining[i].id }, data: { sequenceNumber: i + 1 } });
      }
    }
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-037 (analysis half) — Delete Analysis. Cascades its entries; any RootCause.fiveWhysAnalysisId
 *  referencing it is cleared automatically (onDelete: SetNull), not deleted itself.
 */
export async function deleteFiveWhysAnalysisAction(
  investigationId: number,
  analysisId: number,
): Promise<FiveWhysActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  await db.fiveWhysAnalysis.delete({ where: { id: analysisId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-036 — Generate Recommended Follow-up Question (Investigation Support). Never persists. */
export async function generateFollowUpQuestionAction(
  investigationId: number,
  analysisId: number,
): Promise<{ suggestion: FollowUpSuggestion | null; error: string | null }> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return { suggestion: null, error: mapped.error };
    throw error;
  }

  const lastEntry = await db.fiveWhysEntry.findFirst({
    where: { fiveWhysAnalysisId: analysisId },
    orderBy: { sequenceNumber: "desc" },
  });
  if (!lastEntry) {
    return { suggestion: null, error: "Add at least one Why entry before requesting a suggestion." };
  }

  return { suggestion: suggestFollowUpQuestion(lastEntry.answer), error: null };
}
