"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { markCorrectiveActionCompleteAction } from "@/lib/actions/correctiveAction";
import { markPreventiveActionCompleteAction } from "@/lib/actions/preventiveAction";

/** FR-045a — Mark Action Complete, a distinct, earlier step from Verify Effectiveness (FR-045b). */
export function CompletionForm({
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
  const boundAction = (kind === "corrective" ? markCorrectiveActionCompleteAction : markPreventiveActionCompleteAction).bind(
    null,
    investigationId,
    actionId,
  );
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
        <label htmlFor={`completedDate-${actionId}`} className="text-xs text-muted">Completion Date</label>
        <input
          id={`completedDate-${actionId}`}
          name="completedDate"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        {state.fieldErrors?.completedDate && <p className="text-xs text-red">{state.fieldErrors.completedDate}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Mark Complete"}</Button>
      </div>
    </form>
  );
}
