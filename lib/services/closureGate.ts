import { db } from "@/lib/db";

export interface BlockingAction {
  id: number;
  kind: "Corrective" | "Preventive";
  description: string;
  status: string;
}

export interface ClosureGateResult {
  /** Required actions not yet Completed/Verified/Cancelled — hard-blocks Approve (FR-051). */
  blockingActions: BlockingAction[];
  /** Non-required actions still open — needs an explicit Reviewer acknowledgment, not a hard block. */
  nonRequiredOpenActions: BlockingAction[];
}

const RESOLVED_STATUSES = ["Completed", "Verified", "Cancelled"];

/**
 * data-model.md §6.9.3 / investigation-workflow.md §9.6 — the Review ->
 * Closed hard gate. `Cancelled` counts as resolved (a legitimate way to
 * close out an inapplicable action, not an evasion). Used by FR-051's
 * ordinary Approve (which honors this) — FR-053a's Override and Close
 * deliberately does not call this at all, per its own definition.
 */
export async function checkClosureGate(investigationId: number): Promise<ClosureGateResult> {
  const [correctiveActions, preventiveActions] = await Promise.all([
    db.correctiveAction.findMany({
      where: { investigationId },
      select: { id: true, description: true, status: true, requiredForClosure: true },
    }),
    db.preventiveAction.findMany({
      where: { investigationId },
      select: { id: true, description: true, status: true, requiredForClosure: true },
    }),
  ]);

  const allActions: (BlockingAction & { requiredForClosure: boolean })[] = [
    ...correctiveActions.map((a) => ({ ...a, kind: "Corrective" as const })),
    ...preventiveActions.map((a) => ({ ...a, kind: "Preventive" as const })),
  ];

  const blockingActions = allActions.filter((a) => a.requiredForClosure && !RESOLVED_STATUSES.includes(a.status));
  const nonRequiredOpenActions = allActions.filter((a) => !a.requiredForClosure && !RESOLVED_STATUSES.includes(a.status));

  return {
    blockingActions: blockingActions.map(({ id, kind, description, status }) => ({ id, kind, description, status })),
    nonRequiredOpenActions: nonRequiredOpenActions.map(({ id, kind, description, status }) => ({ id, kind, description, status })),
  };
}
