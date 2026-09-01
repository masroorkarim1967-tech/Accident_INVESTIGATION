import { db } from "@/lib/db";
import { InvestigationStatus, HistoryEventType } from "@/prisma/generated/prisma/client";

/**
 * investigation-workflow.md §6/§8 — the three automatic ("System") stage
 * transitions: Draft -> Open, Open -> UnderInvestigation, UnderInvestigation
 * -> Analysis. Each is gate-satisfied, not a manual ceremony (Analysis ->
 * Review is manual — lib/actions/review.ts's submitForReviewAction).
 *
 * Called at the end of every Server Action that could satisfy one of
 * these gates (occurrence narrative/classification/outcome, investigator
 * assignment, aircraft/flight/location, persons/evidence/witnesses) so the
 * transition fires the instant its gate becomes true, attributed to
 * whichever user's save actually satisfied it (data-model.md §3.24's
 * requirement that a StageAdvanced event's performedByUserId is a real
 * person, never a system pseudo-user) — never checked lazily on a later,
 * unrelated page view by someone else.
 *
 * A no-op (single cheap read, no write) when the investigation's current
 * status isn't one of the three gate-checked statuses, or when the gate
 * isn't yet satisfied — safe to call defensively after any relevant save.
 */
export async function checkAndAdvanceStage(investigationId: number, performedByUserId: number): Promise<void> {
  const investigation = await db.investigation.findUnique({
    where: { id: investigationId },
    include: {
      occurrence: true,
      aircraft: { select: { investigationId: true } },
      flight: { select: { investigationId: true } },
      location: { select: { investigationId: true } },
      _count: { select: { persons: true, evidence: true, witnesses: true } },
    },
  });
  if (!investigation) return;

  switch (investigation.status) {
    case InvestigationStatus.Draft: {
      const occ = investigation.occurrence;
      const gateMet = Boolean(
        investigation.title &&
          investigation.reporterName &&
          occ?.occurrenceDateUtc &&
          occ?.occurrenceTimeUtc &&
          occ?.phaseOfFlight &&
          occ?.briefDescription &&
          occ?.narrativeDescription &&
          investigation.assignedInvestigatorUserId,
      );
      if (gateMet) await advance(investigationId, InvestigationStatus.Draft, InvestigationStatus.Open, performedByUserId);
      return;
    }
    case InvestigationStatus.Open: {
      const occ = investigation.occurrence;
      const gateMet = Boolean(
        occ?.occurrenceCategory &&
          occ?.occurrenceSubcategoryId &&
          occ?.actualOutcomeSeverity &&
          occ?.potentialOutcomeSeverity &&
          occ?.likelihoodOfRecurrence,
      );
      if (gateMet) {
        await advance(investigationId, InvestigationStatus.Open, InvestigationStatus.UnderInvestigation, performedByUserId);
      }
      return;
    }
    case InvestigationStatus.UnderInvestigation: {
      const occ = investigation.occurrence;
      const gateMet = Boolean(
        investigation.aircraft &&
          investigation.flight &&
          investigation.location &&
          (investigation._count.persons > 0 || occ?.noPersonsInvolvedConfirmed) &&
          (investigation._count.evidence > 0 || occ?.noEvidenceAvailableConfirmed) &&
          (investigation._count.witnesses > 0 || occ?.noWitnessesConfirmed),
      );
      if (gateMet) {
        await advance(investigationId, InvestigationStatus.UnderInvestigation, InvestigationStatus.Analysis, performedByUserId);
      }
      return;
    }
    default:
      // Analysis, Review, Closed never advance automatically — Analysis ->
      // Review is the manual "Submit for Review" ceremony (FR-049).
      return;
  }
}

async function advance(
  investigationId: number,
  fromStatus: InvestigationStatus,
  toStatus: InvestigationStatus,
  performedByUserId: number,
): Promise<void> {
  await db.$transaction([
    db.investigation.update({ where: { id: investigationId }, data: { status: toStatus } }),
    db.investigationHistory.create({
      data: {
        investigationId,
        eventType: HistoryEventType.StageAdvanced,
        fromStatus,
        toStatus,
        performedByUserId,
      },
    }),
  ]);
}

export interface GateCheckResult {
  met: boolean;
  unmetItems: string[];
}

/**
 * investigation-workflow.md §8's "Analysis -> Review" row — checked by
 * FR-049's manual submitForReviewAction, not by checkAndAdvanceStage
 * above (this transition is never automatic).
 */
export async function checkAnalysisToReviewGate(investigationId: number): Promise<GateCheckResult> {
  const [hazardCount, contributingFactorCount, rootCauses, actionsWithOwnerAndDate] = await Promise.all([
    db.hazard.count({ where: { investigationId } }),
    db.contributingFactor.count({ where: { investigationId } }),
    db.rootCause.findMany({ where: { investigationId } }),
    countActionsWithOwnerAndDate(investigationId),
  ]);

  const unmetItems: string[] = [];

  if (hazardCount === 0 && contributingFactorCount === 0) {
    unmetItems.push("At least one Hazard or Contributing Factor is required.");
  }

  const hasValidRootCause = rootCauses.some((rc) =>
    rc.isInconclusive
      ? Boolean(rc.inconclusiveJustification && rc.inconclusiveJustification.length >= 20)
      : Boolean(rc.description && rc.category && rc.supportingEvidence && rc.confidenceLevel),
  );
  if (!hasValidRootCause) {
    unmetItems.push(
      "At least one complete Potential Root Cause (Category, Supporting Evidence, Confidence Level) or a justified inconclusive override is required.",
    );
  }

  if (actionsWithOwnerAndDate === 0) {
    unmetItems.push("At least one Corrective or Preventive Action with an owner and Target Date is required.");
  }

  return { met: unmetItems.length === 0, unmetItems };
}

// Owner and Target Date are both required, hard-enforced at action
// creation (EC-14: "there is no such thing as an unowned action"; targetDate
// is NOT NULL) — so any recorded action already satisfies "with an owner
// and due date" by construction; this just counts them.
async function countActionsWithOwnerAndDate(investigationId: number): Promise<number> {
  const [correctiveCount, preventiveCount] = await Promise.all([
    db.correctiveAction.count({ where: { investigationId } }),
    db.preventiveAction.count({ where: { investigationId } }),
  ]);
  return correctiveCount + preventiveCount;
}
