"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Occurrence } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { saveOccurrenceNarrativeAction, type OccurrenceActionState } from "@/lib/actions/occurrence";

const PHASES_OF_FLIGHT = [
  "Standing", "Taxi", "Takeoff", "InitialClimb", "Climb", "Cruise", "Descent", "Approach", "Landing", "GoAround", "PostLandingTaxi",
];

const INITIAL_STATE: OccurrenceActionState = { error: null };

function toTimeInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(11, 16);
}

export function NarrativeForm({
  investigationId,
  occurrence,
  readOnly,
}: {
  investigationId: number;
  occurrence: Occurrence;
  readOnly: boolean;
}) {
  const boundAction = saveOccurrenceNarrativeAction.bind(null, investigationId);
  const [state, formAction, pending] = useActionState(boundAction, INITIAL_STATE);
  // Controlled, not defaultValue: React resets uncontrolled fields after a
  // successful form action, and for a <select> with no <option selected>
  // that reset lands on the first (disabled placeholder) option — silently
  // blocking every subsequent save via native required-field validation,
  // with no visible error. Found during Phase 5 live browser verification.
  const [phaseOfFlight, setPhaseOfFlight] = useState(occurrence.phaseOfFlight ?? "");

  // edge-cases.md EC-17 — a beforeunload warning while this form has
  // unsaved edits. Any field change marks it dirty; a successful save
  // (pending transitions true -> false with no error) clears it.
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) setIsDirty(false);
    wasPending.current = pending;
  }, [pending, state.error]);
  useUnsavedChangesWarning(isDirty);

  return (
    <form action={formAction} onChange={() => setIsDirty(true)} className="flex max-w-2xl flex-col gap-4">
      {state.error && <ErrorBanner message={state.error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="occurrenceDate" className="text-sm text-muted">Occurrence Date (UTC)</label>
          <input
            id="occurrenceDate"
            name="occurrenceDate"
            type="date"
            required
            disabled={readOnly}
            defaultValue={new Date(occurrence.occurrenceDateUtc).toISOString().slice(0, 10)}
            max={new Date().toISOString().slice(0, 10)}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="occurrenceTimeUtc" className="text-sm text-muted">Occurrence Time (UTC)</label>
          <input
            id="occurrenceTimeUtc"
            name="occurrenceTimeUtc"
            type="time"
            required
            disabled={readOnly}
            defaultValue={toTimeInputValue(occurrence.occurrenceTimeUtc)}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="occurrenceTimeLocal" className="text-sm text-muted">Local Time (optional)</label>
          <input
            id="occurrenceTimeLocal"
            name="occurrenceTimeLocal"
            type="time"
            disabled={readOnly}
            defaultValue={toTimeInputValue(occurrence.occurrenceTimeLocal)}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phaseOfFlight" className="text-sm text-muted">Phase of Flight</label>
        <select
          id="phaseOfFlight"
          name="phaseOfFlight"
          required
          disabled={readOnly}
          value={phaseOfFlight}
          onChange={(e) => setPhaseOfFlight(e.target.value)}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
        >
          <option value="" disabled>Select phase of flight</option>
          {PHASES_OF_FLIGHT.map((phase) => (
            <option key={phase} value={phase}>{phase}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="briefDescription" className="text-sm text-muted">Brief Description</label>
        <input
          id="briefDescription"
          name="briefDescription"
          type="text"
          required
          maxLength={240}
          disabled={readOnly}
          defaultValue={occurrence.briefDescription ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="narrativeDescription" className="text-sm text-muted">Narrative Description</label>
        <textarea
          id="narrativeDescription"
          name="narrativeDescription"
          required
          rows={8}
          maxLength={10000}
          disabled={readOnly}
          defaultValue={occurrence.narrativeDescription ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
        />
        {state.fieldErrors?.narrativeDescription && (
          <p className="text-xs text-red">{state.fieldErrors.narrativeDescription}</p>
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
}
