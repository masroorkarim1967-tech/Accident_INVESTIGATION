"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Person } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { savePersonAction, removePersonAction, type PersonActionState } from "@/lib/actions/person";
import { toggleNoPersonsInvolvedAction } from "@/lib/actions/occurrence";

const ROLE_TYPES = ["PIC", "FirstOfficer", "CabinCrew", "ATC", "GroundStaff", "Maintenance", "Passenger", "Other"];
const INJURY_LEVELS = ["None", "Minor", "Serious", "Fatal"];
const INITIAL_STATE: PersonActionState = { error: null };

function InjurySummary({ persons }: { persons: Person[] }) {
  if (persons.length === 0) {
    return <p className="text-sm text-muted">Not yet recorded</p>;
  }
  const counts = INJURY_LEVELS.map((level) => ({
    level,
    count: persons.filter((p) => p.injuryLevel === level).length,
  }));
  return (
    <p className="font-mono text-sm text-foreground">
      {counts.map((c) => `${c.count} ${c.level}`).join(", ")}
    </p>
  );
}

function PersonForm({
  investigationId,
  person,
  onDone,
}: {
  investigationId: number;
  person: Person | null;
  onDone: () => void;
}) {
  const action = savePersonAction.bind(null, investigationId, person?.id ?? null);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  // Close the form once the action actually completes successfully — not
  // on click (which fires before the Server Action has even started). A
  // boolean "isFirstRender" ref doesn't survive React StrictMode's
  // dev-mode double-invocation of effects: the second invocation sees the
  // ref already flipped and fires onDone() immediately on mount, closing
  // the form before the user can type anything (found during Phase 5 live
  // browser verification, npm run dev). Comparing state identity against
  // the last-seen value is robust to that double-invocation, since state
  // hasn't actually changed between the two calls.
  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.error) {
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      {state.error && <ErrorBanner message={state.error} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm text-muted">Name</label>
          <input id="name" name="name" type="text" required maxLength={150} defaultValue={person?.name ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="roleType" className="text-sm text-muted">Role Type</label>
          <select id="roleType" name="roleType" required defaultValue={person?.roleType ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="" disabled>Select role</option>
            {ROLE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="licenseNumber" className="text-sm text-muted">License Number (optional)</label>
          <input id="licenseNumber" name="licenseNumber" type="text" maxLength={50} defaultValue={person?.licenseNumber ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="nationality" className="text-sm text-muted">Nationality (optional)</label>
          <input id="nationality" name="nationality" type="text" maxLength={60} defaultValue={person?.nationality ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="injuryLevel" className="text-sm text-muted">Injury Level</label>
          <select id="injuryLevel" name="injuryLevel" required defaultValue={person?.injuryLevel ?? "None"} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
            {INJURY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm text-muted">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={2} maxLength={5000} defaultValue={person?.notes ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function PersonsPanel({
  investigationId,
  persons,
  noPersonsInvolvedConfirmed,
  readOnly,
}: {
  investigationId: number;
  persons: Person[];
  noPersonsInvolvedConfirmed: boolean;
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const sorted = useMemo(() => [...persons].sort((a, b) => a.roleType.localeCompare(b.roleType) || a.name.localeCompare(b.name)), [persons]);

  async function handleToggleNoPersons() {
    await toggleNoPersonsInvolvedAction(investigationId, !noPersonsInvolvedConfirmed);
  }

  async function handleRemove(personId: number) {
    await removePersonAction(investigationId, personId);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="rounded border border-border bg-surface p-3">
        <p className="text-xs uppercase text-muted">Injury Summary</p>
        {noPersonsInvolvedConfirmed ? (
          <p className="text-sm text-foreground">No persons involved in this occurrence</p>
        ) : (
          <InjurySummary persons={persons} />
        )}
      </div>

      {!readOnly && persons.length === 0 && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={noPersonsInvolvedConfirmed} onChange={handleToggleNoPersons} />
          No persons were involved in this occurrence
        </label>
      )}

      {noPersonsInvolvedConfirmed ? null : sorted.length === 0 ? (
        <p className="text-sm text-muted">No persons recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((person) => (
            <li key={person.id} className="flex items-center justify-between rounded border border-border bg-surface p-3">
              <div>
                <p className="text-sm text-foreground">{person.name} — {person.roleType}</p>
                <p className="text-xs text-muted">Injury: {person.injuryLevel}</p>
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingId(person.id)} className="text-xs text-teal hover:underline">Edit</button>
                  <button type="button" onClick={() => handleRemove(person.id)} className="text-xs text-red hover:underline">Remove</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && !noPersonsInvolvedConfirmed && editingId !== "new" && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setEditingId("new")}>+ Add Person</Button>
        </div>
      )}

      {!readOnly && editingId === "new" && (
        <PersonForm investigationId={investigationId} person={null} onDone={() => setEditingId(null)} />
      )}
      {!readOnly && typeof editingId === "number" && (
        <PersonForm
          investigationId={investigationId}
          person={persons.find((p) => p.id === editingId) ?? null}
          onDone={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
