"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/requireRole";
import { AuthorizationError } from "@/lib/errors";
import { UserRole, InvestigationStatus, HistoryEventType, ReviewDecision } from "@/prisma/generated/prisma/client";

export type ClosureActionState = { error: string | null };

/**
 * FR-054 — Reopen Closed Investigation. Only valid from Closed — this
 * deliberately does NOT use requireInvestigationEditAccess, since that
 * helper always rejects a Closed investigation (the very status this
 * action exists to act on) and also applies the Investigator-must-own-
 * the-investigation check FR-054's "ADMIN, MANAGER, INVESTIGATOR" (any
 * Investigator, investigation-workflow.md §6) does not want.
 */
export async function reopenInvestigationAction(
  investigationId: number,
  _prevState: ClosureActionState,
  formData: FormData,
): Promise<ClosureActionState> {
  let user;
  try {
    user = await requireRole([UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator]);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  const investigation = await db.investigation.findUnique({ where: { id: investigationId } });
  if (!investigation) return { error: "Investigation not found." };
  if (investigation.status !== InvestigationStatus.Closed) {
    return { error: "Only a Closed investigation can be reopened." };
  }

  const reopenReason = String(formData.get("reopenReason") ?? "").trim();
  if (reopenReason.length < 10) {
    return { error: "A reopen reason is required (minimum 10 characters)." };
  }

  await db.$transaction([
    db.investigation.update({
      where: { id: investigationId },
      data: { status: InvestigationStatus.UnderInvestigation, reopenReason },
      // closedAt is deliberately left as-is — historical, not cleared (FR-054 edge case).
    }),
    db.investigationHistory.create({
      data: {
        investigationId,
        eventType: HistoryEventType.Reopened,
        fromStatus: InvestigationStatus.Closed,
        toStatus: InvestigationStatus.UnderInvestigation,
        performedByUserId: user.id,
        reasonText: reopenReason,
      },
    }),
  ]);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/**
 * FR-053a — Override and Close (Administrator closure-gate bypass). Only
 * valid from Review, same scope as FR-051's ordinary Approve (SR-021) —
 * but deliberately does NOT call checkClosureGate at all, since bypassing
 * that gate is this action's entire purpose.
 */
export async function overrideAndCloseAction(
  investigationId: number,
  _prevState: ClosureActionState,
  formData: FormData,
): Promise<ClosureActionState> {
  let user;
  try {
    user = await requireRole([UserRole.Administrator]);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  const investigation = await db.investigation.findUnique({ where: { id: investigationId } });
  if (!investigation) return { error: "Investigation not found." };
  if (investigation.status !== InvestigationStatus.Review) {
    return { error: "Override and Close is only available from Review status." };
  }

  const justification = String(formData.get("justification") ?? "").trim();
  if (justification.length < 20) {
    return { error: "A justification is required (minimum 20 characters) to override the closure gate." };
  }

  await db.$transaction(async (tx) => {
    const review = await tx.investigationReview.create({
      data: { investigationId, reviewerUserId: user.id, reviewDecision: ReviewDecision.Approved },
    });
    await tx.investigation.update({
      where: { id: investigationId },
      data: { status: InvestigationStatus.Closed, closedAt: new Date() },
    });
    await tx.investigationHistory.create({
      data: {
        investigationId,
        eventType: HistoryEventType.Closed,
        fromStatus: InvestigationStatus.Review,
        toStatus: InvestigationStatus.Closed,
        performedByUserId: user.id,
        relatedReviewId: review.id,
        reasonText: justification,
      },
    });
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
