"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Witness } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { saveWitnessAction, removeWitnessAction, toggleNoWitnessesAction, type WitnessActionState } from "@/lib/actions/witness";

const WITNESS_TYPES = ["Crew", "Passenger", "ATC", "GroundObserver", "Other"];
const ASSESSMENT_LEVELS = ["High", "Medium", "Low"];
const INITIAL_STATE: WitnessActionState = { error: null };

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function WitnessForm({
  investigationId,
  witness,
  onDone,
}: {
  investigationId: number;
  witness: Witness | null;
  onDone: () => void;
}) {
  const action = saveWitnessAction.bind(null, investigationId, witness?.id ?? null);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  // Identity-comparison close pattern — see PersonsPanel.tsx for why a
  // boolean "isFirstRender" ref doesn't survive React StrictMode's
  // dev-mode double-invocation of effects.
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm text-muted">Name</label>
          <input id="name" name="name" type="text" required maxLength={150} defaultValue={witness?.name ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="witnessType" className="text-sm text-muted">Witness Type</label>
          <select id="witnessType" name="witnessType" required defaultValue={witness?.witnessType ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="" disabled>Select type</option>
            {WITNESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="contactInfo" className="text-sm text-muted">Contact Info (optional)</label>
          <input id="contactInfo" name="contactInfo" type="text" maxLength={200} defaultValue={witness?.contactInfo ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="statementDate" className="text-sm text-muted">Statement Date (optional)</label>
          <input id="statementDate" name="statementDate" type="date" defaultValue={toDateInputValue(witness?.statementDate ?? null)} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reliabilityAssessment" className="text-sm text-muted">Reliability Assessment</label>
          <select id="reliabilityAssessment" name="reliabilityAssessment" required defaultValue={witness?.reliabilityAssessment ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="" disabled>Select reliability</option>
            {ASSESSMENT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="statementSummary" className="text-sm text-muted">Statement Summary</label>
        <textarea id="statementSummary" name="statementSummary" required rows={3} defaultValue={witness?.statementSummary ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        {state.fieldErrors?.statementSummary && <p className="text-xs text-red">{state.fieldErrors.statementSummary}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reliabilityNotes" className="text-sm text-muted">Reliability Notes (optional)</label>
        <textarea id="reliabilityNotes" name="reliabilityNotes" rows={2} defaultValue={witness?.reliabilityNotes ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function WitnessPanel({
  investigationId,
  witnesses,
  noWitnessesConfirmed,
  readOnly,
}: {
  investigationId: number;
  witnesses: Witness[];
  noWitnessesConfirmed: boolean;
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);

  // EC-08 — most-recent statement first, undated entries last.
  const sorted = useMemo(
    () =>
      [...witnesses].sort((a, b) => {
        if (!a.statementDate && !b.statementDate) return 0;
        if (!a.statementDate) return 1;
        if (!b.statementDate) return -1;
        return b.statementDate.getTime() - a.statementDate.getTime();
      }),
    [witnesses],
  );

  async function handleToggleNoWitnesses() {
    await toggleNoWitnessesAction(investigationId, !noWitnessesConfirmed);
  }

  async function handleRemove(witnessId: number) {
    await removeWitnessAction(investigationId, witnessId);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {!readOnly && witnesses.length === 0 && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={noWitnessesConfirmed} onChange={handleToggleNoWitnesses} />
          No witnesses were identified for this occurrence
        </label>
      )}

      {noWitnessesConfirmed ? (
        <p className="text-sm text-foreground">No witnesses recorded</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted">No witnesses recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((witness) => (
            <li key={witness.id} className="rounded border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-foreground">{witness.name} — {witness.witnessType}</p>
                  <p className="text-xs text-muted">
                    Reliability: {witness.reliabilityAssessment}
                    {witness.statementDate ? ` · ${toDateInputValue(witness.statementDate)}` : ""}
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex flex-shrink-0 gap-2">
                    <button type="button" onClick={() => setEditingId(witness.id)} className="text-xs text-teal hover:underline">Edit</button>
                    <button type="button" onClick={() => handleRemove(witness.id)} className="text-xs text-red hover:underline">Remove</button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-foreground">{witness.statementSummary}</p>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && !noWitnessesConfirmed && editingId !== "new" && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setEditingId("new")}>+ Add Witness</Button>
        </div>
      )}

      {!readOnly && editingId === "new" && (
        <WitnessForm investigationId={investigationId} witness={null} onDone={() => setEditingId(null)} />
      )}
      {!readOnly && typeof editingId === "number" && (
        <WitnessForm
          investigationId={investigationId}
          witness={witnesses.find((w) => w.id === editingId) ?? null}
          onDone={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
