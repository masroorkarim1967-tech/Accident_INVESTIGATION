"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { assignInvestigatorAction, type AssignInvestigatorState } from "@/lib/actions/investigation";

const INITIAL_STATE: AssignInvestigatorState = { error: null };

export function AssignInvestigatorForm({
  investigationId,
  investigators,
  currentAssigneeId,
}: {
  investigationId: number;
  investigators: { id: number; name: string }[];
  currentAssigneeId: number | null;
}) {
  const [state, formAction, pending] = useActionState(assignInvestigatorAction, INITIAL_STATE);

  if (investigators.length === 0) {
    return <p className="text-sm text-muted">No investigators available — add one from User Management.</p>;
  }

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="investigationId" value={investigationId} />
      {state.error && <ErrorBanner message={state.error} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="investigatorUserId" className="text-xs text-muted">
          Investigator
        </label>
        <select
          id="investigatorUserId"
          name="investigatorUserId"
          defaultValue={currentAssigneeId ?? ""}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-teal"
        >
          <option value="" disabled>
            Select an investigator
          </option>
          {investigators.map((investigator) => (
            <option key={investigator.id} value={investigator.id}>
              {investigator.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Assigning…" : currentAssigneeId ? "Reassign" : "Assign"}
      </Button>
    </form>
  );
}
