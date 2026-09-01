"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionPriority } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { saveCorrectiveActionAction } from "@/lib/actions/correctiveAction";
import { savePreventiveActionAction } from "@/lib/actions/preventiveAction";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export interface ActionFormRow {
  id: number;
  description: string;
  priority: ActionPriority;
  targetDate: Date;
  ownerUserId: number | null;
  ownerExternalName: string | null;
  department: string | null;
  rootCauseId: number | null;
  hazardId: number | null;
  requiredForClosure: boolean;
  investigatorComments: string | null;
}

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

/** FR-040/FR-042 — Add/Edit Corrective/Preventive Action. Identical shape either way (ui-spec.md §15). */
export function ActionForm({
  kind,
  investigationId,
  action,
  users,
  rootCauses,
  hazards,
  onDone,
}: {
  kind: "corrective" | "preventive";
  investigationId: number;
  action: ActionFormRow | null;
  users: { id: number; name: string }[];
  rootCauses: { id: number; description: string }[];
  hazards: { id: number; description: string }[];
  onDone: () => void;
}) {
  const boundAction = (kind === "corrective" ? saveCorrectiveActionAction : savePreventiveActionAction).bind(
    null,
    investigationId,
    action?.id ?? null,
  );
  const [state, formAction, pending] = useActionState(boundAction, { error: null });
  const [ownerMode, setOwnerMode] = useState<"registered" | "external">(action?.ownerExternalName ? "external" : "registered");
  const [requiredForClosure, setRequiredForClosure] = useState(action?.requiredForClosure ?? kind === "corrective");

  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      {state.error && <ErrorBanner message={state.error} />}
      <input type="hidden" name="requiredForClosure" value={String(requiredForClosure)} />

      <div className="flex flex-col gap-1">
        <label htmlFor={`description-${kind}`} className="text-sm text-muted">Description</label>
        <textarea
          id={`description-${kind}`}
          name="description"
          required
          rows={2}
          defaultValue={action?.description ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`priority-${kind}`} className="text-sm text-muted">Priority</label>
          <select
            id={`priority-${kind}`}
            name="priority"
            required
            defaultValue={action?.priority ?? ""}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="" disabled>Select priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`targetDate-${kind}`} className="text-sm text-muted">Target Date</label>
          <input
            id={`targetDate-${kind}`}
            name="targetDate"
            type="date"
            required
            defaultValue={action ? toDateInputValue(action.targetDate) : ""}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {state.fieldErrors?.targetDate && <p className="text-xs text-red">{state.fieldErrors.targetDate}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Responsible Person</p>
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
            defaultValue={action?.ownerUserId ?? ""}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
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
            defaultValue={action?.ownerExternalName ?? ""}
            placeholder="External responsible person's name"
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        )}
        {state.fieldErrors?.ownerExternalName && <p className="text-xs text-red">{state.fieldErrors.ownerExternalName}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`department-${kind}`} className="text-sm text-muted">Department (optional)</label>
        <input
          id={`department-${kind}`}
          name="department"
          type="text"
          maxLength={100}
          defaultValue={action?.department ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rootCauses.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`rootCauseId-${kind}`} className="text-sm text-muted">Linked Root Cause (optional)</label>
            <select
              id={`rootCauseId-${kind}`}
              name="rootCauseId"
              defaultValue={action?.rootCauseId ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">None</option>
              {rootCauses.map((rc) => (
                <option key={rc.id} value={rc.id}>{rc.description}</option>
              ))}
            </select>
          </div>
        )}
        {hazards.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`hazardId-${kind}`} className="text-sm text-muted">Linked Hazard (optional)</label>
            <select
              id={`hazardId-${kind}`}
              name="hazardId"
              defaultValue={action?.hazardId ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">None</option>
              {hazards.map((h) => (
                <option key={h.id} value={h.id}>{h.description}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={requiredForClosure} onChange={(e) => setRequiredForClosure(e.target.checked)} />
        Required for Closure
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor={`investigatorComments-${kind}`} className="text-sm text-muted">Investigator Comments (optional)</label>
        <textarea
          id={`investigatorComments-${kind}`}
          name="investigatorComments"
          rows={2}
          defaultValue={action?.investigatorComments ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}
