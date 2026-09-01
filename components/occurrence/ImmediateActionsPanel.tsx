"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ImmediateAction } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  saveImmediateActionAction,
  removeImmediateActionAction,
  type ImmediateActionActionState,
} from "@/lib/actions/immediateAction";

const ACTION_TYPES = ["Safety", "Operational", "Notification"];
const INITIAL_STATE: ImmediateActionActionState = { error: null };

function toDateTimeLocal(date: Date): string {
  return new Date(date).toISOString().slice(0, 16);
}

function EntryForm({
  investigationId,
  entry,
  onDone,
}: {
  investigationId: number;
  entry: ImmediateAction | null;
  onDone: () => void;
}) {
  const action = saveImmediateActionAction.bind(null, investigationId, entry?.id ?? null);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  // A boolean "isFirstRender" ref doesn't survive React StrictMode's
  // dev-mode double-invocation of effects — see PersonsPanel.tsx for the
  // full explanation. Comparing state identity against the last-seen value
  // is robust to that double-invocation.
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
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-muted">Description</label>
        <textarea id="description" name="description" required rows={2} defaultValue={entry?.description ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="takenBy" className="text-sm text-muted">Taken By</label>
          <input id="takenBy" name="takenBy" type="text" required maxLength={150} defaultValue={entry?.takenBy ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="occurredAt" className="text-sm text-muted">Date/Time</label>
          <input id="occurredAt" name="occurredAt" type="datetime-local" required defaultValue={entry ? toDateTimeLocal(entry.occurredAt) : ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
          {state.fieldErrors?.occurredAt && <p className="text-xs text-red">{state.fieldErrors.occurredAt}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="actionType" className="text-sm text-muted">Action Type</label>
          <select id="actionType" name="actionType" required defaultValue={entry?.actionType ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="" disabled>Select type</option>
            {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function ImmediateActionsPanel({
  investigationId,
  entries,
  readOnly,
}: {
  investigationId: number;
  entries: ImmediateAction[];
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);

  async function handleRemove(entryId: number) {
    await removeImmediateActionAction(investigationId, entryId);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No immediate actions recorded.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between rounded border border-border bg-surface p-3">
              <div>
                <p className="text-sm text-foreground">{entry.description}</p>
                <p className="text-xs text-muted">
                  {entry.takenBy} · {new Date(entry.occurredAt).toISOString().slice(0, 16).replace("T", " ")}Z · {entry.actionType}
                </p>
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingId(entry.id)} className="text-xs text-teal hover:underline">Edit</button>
                  <button type="button" onClick={() => handleRemove(entry.id)} className="text-xs text-red hover:underline">Remove</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && editingId !== "new" && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setEditingId("new")}>+ Add Immediate Action</Button>
        </div>
      )}
      {!readOnly && editingId === "new" && (
        <EntryForm investigationId={investigationId} entry={null} onDone={() => setEditingId(null)} />
      )}
      {!readOnly && typeof editingId === "number" && (
        <EntryForm
          investigationId={investigationId}
          entry={entries.find((e) => e.id === editingId) ?? null}
          onDone={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
