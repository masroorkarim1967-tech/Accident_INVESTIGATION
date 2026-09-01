"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { requireRole } from "@/lib/auth/requireRole";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { checkAnalysisToReviewGate } from "@/lib/services/stageTransition";
import { checkClosureGate } from "@/lib/services/closureGate";
import { UserRole, InvestigationStatus, HistoryEventType, ReviewDecision } from "@/prisma/generated/prisma/client";

const SUBMIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];
// FR-051/FR-052's own User line: REVIEWER, with ADMIN retaining an
// emergency override (product-spec.md §0.2's explicit example of a
// restricted action) — deliberately narrower than SUBMIT_ROLES; MANAGER
// cannot approve or request changes.
const DECIDE_ROLES = [UserRole.Administrator, UserRole.Reviewer];

export type ReviewActionState = { error: string | null; unmetItems?: string[]; blockingActions?: { id: number; kind: string; description: string }[] };

function mapEditAccessError(error: unknown): ReviewActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-049 — Submit Investigation for Review. Only valid from Analysis. */
export async function submitForReviewAction(investigationId: number): Promise<ReviewActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, SUBMIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const investigation = await db.investigation.findUniqueOrThrow({ where: { id: investigationId } });
  if (investigation.status !== InvestigationStatus.Analysis) {
    return { error: `This investigation cannot be submitted for review from its current status (${investigation.status}).` };
  }

  const gate = await checkAnalysisToReviewGate(investigationId);
  if (!gate.met) {
    return { error: "This investigation isn't ready for review yet.", unmetItems: gate.unmetItems };
  }

  await db.$transaction([
    db.investigation.update({ where: { id: investigationId }, data: { status: InvestigationStatus.Review } }),
    db.investigationHistory.create({
      data: {
        investigationId,
        eventType: HistoryEventType.SubmittedForReview,
        fromStatus: InvestigationStatus.Analysis,
        toStatus: InvestigationStatus.Review,
        performedByUserId: user.id,
      },
    }),
  ]);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-051 — Approve Investigation. Only valid from Review; blocked by the requiredForClosure gate. */
export async function approveInvestigationAction(
  investigationId: number,
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  let user;
  try {
    user = await requireRole(DECIDE_ROLES);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  const investigation = await db.investigation.findUnique({ where: { id: investigationId } });
  if (!investigation) return { error: "Investigation not found." };
  if (investigation.status !== InvestigationStatus.Review) {
    return { error: `This investigation cannot be approved from its current status (${investigation.status}).` };
  }

  const gate = await checkClosureGate(investigationId);
  if (gate.blockingActions.length > 0) {
    return {
      error: "This investigation has required actions that are not yet resolved.",
      blockingActions: gate.blockingActions,
    };
  }

  const comments = String(formData.get("comments") ?? "").trim();

  await db.$transaction(async (tx) => {
    const review = await tx.investigationReview.create({
      data: { investigationId, reviewerUserId: user.id, reviewDecision: ReviewDecision.Approved, comments: comments || null },
    });
    await tx.investigation.update({
      where: { id: investigationId },
      data: { status: InvestigationStatus.Closed, closedAt: new Date() },
    });
    await tx.investigationHistory.create({
      data: {
        investigationId,
        eventType: HistoryEventType.ReviewApproved,
        fromStatus: InvestigationStatus.Review,
        toStatus: InvestigationStatus.Closed,
        performedByUserId: user.id,
        relatedReviewId: review.id,
      },
    });
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-052 — Request Changes. Only valid from Review; returns directly to Analysis (no stored "changes requested" status). */
export async function requestChangesAction(
  investigationId: number,
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  let user;
  try {
    user = await requireRole(DECIDE_ROLES);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  const investigation = await db.investigation.findUnique({ where: { id: investigationId } });
  if (!investigation) return { error: "Investigation not found." };
  if (investigation.status !== InvestigationStatus.Review) {
    return { error: `Changes cannot be requested from this investigation's current status (${investigation.status}).` };
  }

  const comments = String(formData.get("comments") ?? "").trim();
  if (comments.length < 10) {
    return { error: "Comments are required (minimum 10 characters) when requesting changes." };
  }

  await db.$transaction(async (tx) => {
    const review = await tx.investigationReview.create({
      data: { investigationId, reviewerUserId: user.id, reviewDecision: ReviewDecision.ChangesRequested, comments },
    });
    await tx.investigation.update({ where: { id: investigationId }, data: { status: InvestigationStatus.Analysis } });
    await tx.investigationHistory.create({
      data: {
        investigationId,
        eventType: HistoryEventType.ReviewChangesRequested,
        fromStatus: InvestigationStatus.Review,
        toStatus: InvestigationStatus.Analysis,
        performedByUserId: user.id,
        relatedReviewId: review.id,
      },
    });
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
