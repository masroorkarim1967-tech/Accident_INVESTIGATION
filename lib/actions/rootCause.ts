"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { rootCauseSchema } from "@/lib/validation/rootCause";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type RootCauseActionState = { error: string | null; fieldErrors?: Record<string, string> };

function mapEditAccessError(error: unknown): RootCauseActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/**
 * FR-038 — Add/Edit Root Cause. Reachable either standalone (fiveWhysAnalysisId
 * omitted) or via a FiveWhysAnalysis card's "Conclude Analysis" action
 * (fiveWhysAnalysisId pre-filled) — same save path either way.
 */
export async function saveRootCauseAction(
  investigationId: number,
  rootCauseId: number | null,
  _prevState: RootCauseActionState,
  formData: FormData,
): Promise<RootCauseActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  // RootCauseForm conditionally unmounts the normal-mode fields while
  // `isInconclusive` is toggled on (and vice versa), so a real submission
  // omits whichever half isn't shown — FormData.get() returns null for
  // those, which zod's `.optional()` (undefined-only) rejects. Normalizing
  // every optional field through `|| undefined` here treats "missing" and
  // "empty string" identically, which is already how the schema's
  // superRefine judges them (a falsy check) either way.
  const parsed = rootCauseSchema.safeParse({
    isInconclusive: formData.get("isInconclusive") === "true",
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    supportingEvidence: formData.get("supportingEvidence") || undefined,
    investigatorNotes: formData.get("investigatorNotes") || undefined,
    confidenceLevel: formData.get("confidenceLevel") || undefined,
    inconclusiveJustification: formData.get("inconclusiveJustification") || undefined,
    fiveWhysAnalysisId: formData.get("fiveWhysAnalysisId") || undefined,
    contributingFactorIds: formData.getAll("contributingFactorIds"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const { fiveWhysAnalysisId, contributingFactorIds } = parsed.data;

  if (fiveWhysAnalysisId) {
    const analysis = await db.fiveWhysAnalysis.findUnique({ where: { id: fiveWhysAnalysisId } });
    if (!analysis || analysis.investigationId !== investigationId) {
      return { error: "Selected 5 Whys analysis does not belong to this investigation." };
    }
    // data-model.md §3.17: a given FiveWhysAnalysis may be linked from at
    // most one RootCause — pre-checked here for a friendly message rather
    // than surfacing the DB's unique-constraint error.
    const existingLink = await db.rootCause.findUnique({ where: { fiveWhysAnalysisId } });
    if (existingLink && existingLink.id !== rootCauseId) {
      return { error: "This 5 Whys analysis is already concluded by another Root Cause." };
    }
  }

  if (contributingFactorIds.length > 0) {
    const ownedCount = await db.contributingFactor.count({
      where: { id: { in: contributingFactorIds }, investigationId },
    });
    if (ownedCount !== contributingFactorIds.length) {
      return { error: "One or more selected contributing factors do not belong to this investigation." };
    }
  }

  const data = parsed.data.isInconclusive
    ? {
        isInconclusive: true,
        inconclusiveJustification: parsed.data.inconclusiveJustification || null,
        description: null,
        category: null,
        supportingEvidence: null,
        confidenceLevel: null,
        fiveWhysAnalysisId: fiveWhysAnalysisId ?? null,
      }
    : {
        isInconclusive: false,
        inconclusiveJustification: null,
        description: parsed.data.description || null,
        category: parsed.data.category || null,
        supportingEvidence: parsed.data.supportingEvidence || null,
        confidenceLevel: parsed.data.confidenceLevel || null,
        investigatorNotes: parsed.data.investigatorNotes || null,
        fiveWhysAnalysisId: fiveWhysAnalysisId ?? null,
      };

  await db.$transaction(async (tx) => {
    const rootCause = rootCauseId
      ? await tx.rootCause.update({ where: { id: rootCauseId }, data })
      : await tx.rootCause.create({ data: { investigationId, ...data } });

    await tx.rootCauseContributingFactorLink.deleteMany({ where: { rootCauseId: rootCause.id } });
    if (contributingFactorIds.length > 0) {
      await tx.rootCauseContributingFactorLink.createMany({
        data: contributingFactorIds.map((contributingFactorId) => ({ rootCauseId: rootCause.id, contributingFactorId })),
      });
    }
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/**
 * FR-039 — Remove Root Cause. `CorrectiveAction.rootCauseId` does not
 * exist in the schema yet (Phase 9) — nothing to clear there until that
 * phase lands, same deferred-reference situation Hazard's FR-030 action
 * documents. The linked FiveWhysAnalysis, if any, is untouched and
 * becomes eligible again for "Conclude Analysis."
 */
export async function removeRootCauseAction(investigationId: number, rootCauseId: number): Promise<RootCauseActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  await db.rootCause.delete({ where: { id: rootCauseId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
