"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { approveInvestigationAction, requestChangesAction, type ReviewActionState } from "@/lib/actions/review";
import { overrideAndCloseAction, type ClosureActionState } from "@/lib/actions/closure";

const INITIAL_REVIEW_STATE: ReviewActionState = { error: null };
const INITIAL_CLOSURE_STATE: ClosureActionState = { error: null };

export interface BlockingActionRow {
  id: number;
  kind: string;
  description: string;
  status: string;
}

/**
 * ui-spec.md §16 — Reviewer decision form (Approve/Request Changes),
 * plus the ADMIN-only "Override and Close" escalation, distinct
 * per SR-021 (see FR-051's Edge Cases: two separate `Review`-scoped
 * escalations, not the same action described twice).
 */
export function ReviewDecisionForm({
  investigationId,
  blockingActions,
  nonRequiredOpenActions,
  isAdmin,
}: {
  investigationId: number;
  blockingActions: BlockingActionRow[];
  nonRequiredOpenActions: BlockingActionRow[];
  isAdmin: boolean;
}) {
  const approveAction = approveInvestigationAction.bind(null, investigationId);
  const [approveState, approveFormAction, approvePending] = useActionState(approveAction, INITIAL_REVIEW_STATE);

  const changesAction = requestChangesAction.bind(null, investigationId);
  const [changesState, changesFormAction, changesPending] = useActionState(changesAction, INITIAL_REVIEW_STATE);

  const overrideAction = overrideAndCloseAction.bind(null, investigationId);
  const [overrideState, overrideFormAction, overridePending] = useActionState(overrideAction, INITIAL_CLOSURE_STATE);

  const [acknowledged, setAcknowledged] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [showOverride, setShowOverride] = useState(false);

  const canApprove = blockingActions.length === 0 && (nonRequiredOpenActions.length === 0 || acknowledged);

  return (
    <div className="flex flex-col gap-4 rounded border border-border bg-surface p-4">
      {approveState.error && <ErrorBanner message={approveState.error} />}
      {approveState.blockingActions && approveState.blockingActions.length > 0 && (
        <ul className="list-inside list-disc text-xs text-red">
          {approveState.blockingActions.map((a) => (
            <li key={a.id}>{a.kind} action: {a.description}</li>
          ))}
        </ul>
      )}

      {blockingActions.length > 0 && (
        <div className="rounded border border-red bg-red/10 p-3">
          <p className="text-sm font-medium text-red">
            {blockingActions.length} required action{blockingActions.length === 1 ? "" : "s"} not yet resolved:
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-red">
            {blockingActions.map((a) => (
              <li key={a.id}>{a.kind}: {a.description} ({a.status ?? "unresolved"})</li>
            ))}
          </ul>
        </div>
      )}

      {nonRequiredOpenActions.length > 0 && (
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />
          Acknowledge {nonRequiredOpenActions.length} non-required action{nonRequiredOpenActions.length === 1 ? "" : "s"} still open
        </label>
      )}

      <form action={approveFormAction} className="flex flex-col gap-2">
        <label htmlFor="approve-comments" className="text-sm text-muted">Comments (optional)</label>
        <textarea id="approve-comments" name="comments" rows={2} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        <div className="flex justify-end">
          <Button type="submit" disabled={approvePending || !canApprove}>
            {approvePending ? "Approving…" : "Approve"}
          </Button>
        </div>
      </form>

      <div className="border-t border-border pt-3">
        {!showRequestChanges ? (
          <Button type="button" variant="destructive" onClick={() => setShowRequestChanges(true)}>Request Changes</Button>
        ) : (
          <form action={changesFormAction} className="flex flex-col gap-2">
            {changesState.error && <ErrorBanner message={changesState.error} />}
            <label htmlFor="changes-comments" className="text-sm text-muted">Comments (required, minimum 10 characters)</label>
            <textarea id="changes-comments" name="comments" required rows={3} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowRequestChanges(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={changesPending}>
                {changesPending ? "Sending…" : "Request Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {isAdmin && blockingActions.length > 0 && (
        <div className="border-t border-amber pt-3">
          {!showOverride ? (
            <button type="button" onClick={() => setShowOverride(true)} className="text-xs text-amber hover:underline">
              Override and Close
            </button>
          ) : (
            <form action={overrideFormAction} className="flex flex-col gap-2">
              {overrideState.error && <ErrorBanner message={overrideState.error} />}
              <label htmlFor="justification" className="text-xs text-amber">
                Justification (required, minimum 20 characters) — bypasses the required-actions gate above.
              </label>
              <textarea id="justification" name="justification" required rows={3} className="rounded border border-amber bg-background px-3 py-2 text-sm text-foreground" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowOverride(false)}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={overridePending}>
                  {overridePending ? "Closing…" : "Override and Close"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
