import type { ActionCardRow } from "./ActionCard";

/** FR-048 — per-investigation action summary counts (both kinds combined). */
export function ActionSummaryCard({ actions }: { actions: ActionCardRow[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-muted">No actions defined yet.</p>;
  }

  const counts = {
    Open: 0,
    Assigned: 0,
    InProgress: 0,
    Completed: 0,
    Verified: 0,
    Cancelled: 0,
    Overdue: 0,
  };
  let awaitingVerification = 0;
  let requiredNotResolved = 0;

  for (const action of actions) {
    if (action.overdue) {
      counts.Overdue += 1;
    } else {
      counts[action.status] += 1;
    }
    if (action.status === "Completed" && !action.effectivenessResult) {
      awaitingVerification += 1;
    }
    if (action.requiredForClosure && action.status !== "Completed" && action.status !== "Verified" && action.status !== "Cancelled") {
      requiredNotResolved += 1;
    }
  }

  return (
    <div className="flex flex-wrap gap-4 rounded border border-border bg-surface p-4">
      {Object.entries(counts).map(([status, count]) => (
        <div key={status}>
          <p className="text-xs uppercase text-muted">{status}</p>
          <p className="font-mono text-sm text-foreground">{count}</p>
        </div>
      ))}
      <div>
        <p className="text-xs uppercase text-muted">Awaiting Verification</p>
        <p className="font-mono text-sm text-foreground">{awaitingVerification}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-amber">Required, Not Resolved</p>
        <p className="font-mono text-sm text-foreground">{requiredNotResolved}</p>
      </div>
    </div>
  );
}
