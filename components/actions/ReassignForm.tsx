"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { reassignCorrectiveActionOwnerAction } from "@/lib/actions/correctiveAction";
import { reassignPreventiveActionOwnerAction } from "@/lib/actions/preventiveAction";

/** FR-047 — Reassign Action Owner. */
export function ReassignForm({
  kind,
  investigationId,
  actionId,
  users,
  currentOwnerUserId,
  currentOwnerExternalName,
  currentDepartment,
  onDone,
}: {
  kind: "corrective" | "preventive";
  investigationId: number;
  actionId: number;
  users: { id: number; name: string }[];
  currentOwnerUserId: number | null;
  currentOwnerExternalName: string | null;
  currentDepartment: string | null;
  onDone: () => void;
}) {
  const boundAction = (kind === "corrective" ? reassignCorrectiveActionOwnerAction : reassignPreventiveActionOwnerAction).bind(
    null,
    investigationId,
    actionId,
  );
  const [state, formAction, pending] = useActionState(boundAction, { error: null });
  const [ownerMode, setOwnerMode] = useState<"registered" | "external">(currentOwnerExternalName ? "external" : "registered");

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
      <div className="flex gap-4 text-sm text-foreground">
        <label className="flex items-center gap-1">
          <input type="radio" checked={ownerMode === "registered"} onChange={() => setOwnerMode("registered")} />
          Registered user
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={ownerMode === "external"} onChange={() => setOwnerMode("external")} />
          External
        </label>
      </div>
      {ownerMode === "registered" ? (
        <select
          name="ownerUserId"
          defaultValue={currentOwnerUserId ?? ""}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="">Select a person</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          name="ownerExternalName"
          maxLength={150}
          defaultValue={currentOwnerExternalName ?? ""}
          placeholder="External responsible person's name"
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      )}
      {state.fieldErrors?.ownerExternalName && <p className="text-xs text-red">{state.fieldErrors.ownerExternalName}</p>}
      <input
        type="text"
        name="department"
        maxLength={100}
        defaultValue={currentDepartment ?? ""}
        placeholder="Department (optional)"
        className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Reassign"}</Button>
      </div>
    </form>
  );
}
