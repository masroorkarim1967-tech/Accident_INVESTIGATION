"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { verifyCorrectiveActionEffectivenessAction } from "@/lib/actions/correctiveAction";
import { verifyPreventiveActionEffectivenessAction } from "@/lib/actions/preventiveAction";

const VERIFICATION_METHODS = ["FollowUpInspection", "DataReview", "Audit", "Retest", "StakeholderInterview", "Other"];
const VERIFICATION_METHOD_LABELS: Record<string, string> = {
  FollowUpInspection: "Follow-up Inspection",
  DataReview: "Data Review",
  Audit: "Audit",
  Retest: "Retest",
  StakeholderInterview: "Stakeholder Interview",
  Other: "Other",
};
const EFFECTIVENESS_RESULTS = ["Effective", "PartiallyEffective", "NotEffective", "TooEarlyToAssess"];
const EFFECTIVENESS_RESULT_LABELS: Record<string, string> = {
  Effective: "Effective",
  PartiallyEffective: "Partially Effective",
  NotEffective: "Not Effective",
  TooEarlyToAssess: "Too Early to Assess",
};

/**
 * FR-045b — Verify Action Effectiveness, distinct from the completion form
 * (FR-045a). Only ever rendered by the parent for a user eligible to see
 * it (never the action's own owner) — the Server Action re-checks this
 * server-side regardless (NFR-4.7), matching ui-spec.md §15's "hidden
 * entirely, not merely disabled" rule.
 */
export function VerificationForm({
  kind,
  investigationId,
  actionId,
  onDone,
}: {
  kind: "corrective" | "preventive";
  investigationId: number;
  actionId: number;
  onDone: () => void;
}) {
  const boundAction = (
    kind === "corrective" ? verifyCorrectiveActionEffectivenessAction : verifyPreventiveActionEffectivenessAction
  ).bind(null, investigationId, actionId);
  const [state, formAction, pending] = useActionState(boundAction, { error: null });

  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border border-border bg-background p-3">
      {state.error && <ErrorBanner message={state.error} />}
      <div className="flex flex-col gap-1">
        <label htmlFor={`verificationMethod-${actionId}`} className="text-xs text-muted">Verification Method</label>
        <select
          id={`verificationMethod-${actionId}`}
          name="verificationMethod"
          required
          defaultValue=""
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="" disabled>Select method</option>
          {VERIFICATION_METHODS.map((m) => (
            <option key={m} value={m}>{VERIFICATION_METHOD_LABELS[m]}</option>
          ))}
        </select>
        {state.fieldErrors?.verificationMethod && <p className="text-xs text-red">{state.fieldErrors.verificationMethod}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`effectivenessResult-${actionId}`} className="text-xs text-muted">Effectiveness Result</label>
        <select
          id={`effectivenessResult-${actionId}`}
          name="effectivenessResult"
          required
          defaultValue=""
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="" disabled>Select result</option>
          {EFFECTIVENESS_RESULTS.map((r) => (
            <option key={r} value={r}>{EFFECTIVENESS_RESULT_LABELS[r]}</option>
          ))}
        </select>
        {state.fieldErrors?.effectivenessResult && <p className="text-xs text-red">{state.fieldErrors.effectivenessResult}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`verificationNotes-${actionId}`} className="text-xs text-muted">Verification Notes (optional)</label>
        <textarea
          id={`verificationNotes-${actionId}`}
          name="verificationNotes"
          rows={2}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Verify Effectiveness"}</Button>
      </div>
    </form>
  );
}
