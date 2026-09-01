"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { reopenInvestigationAction, type ClosureActionState } from "@/lib/actions/closure";

const INITIAL_STATE: ClosureActionState = { error: null };

/** FR-054 — Reopen Closed Investigation. */
export function ReopenForm({ investigationId }: { investigationId: number }) {
  const boundAction = reopenInvestigationAction.bind(null, investigationId);
  const [state, formAction, pending] = useActionState(boundAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border border-border bg-surface p-4">
      {state.error && <ErrorBanner message={state.error} />}
      <label htmlFor="reopenReason" className="text-sm text-muted">
        Reopen Reason (required, minimum 10 characters)
      </label>
      <textarea
        id="reopenReason"
        name="reopenReason"
        required
        rows={3}
        className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Reopening…" : "Reopen Investigation"}
        </Button>
      </div>
    </form>
  );
}
