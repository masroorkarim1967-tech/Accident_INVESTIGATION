"use client";

import { useActionState, useState } from "react";
import type { Flight } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FormField } from "@/components/ui/FormField";
import { saveFlightAction, type FlightActionState } from "@/lib/actions/flight";

const INITIAL_STATE: FlightActionState = { error: null };

export function FlightForm({
  investigationId,
  flight,
  readOnly,
}: {
  investigationId: number;
  flight: Flight | null;
  readOnly: boolean;
}) {
  const action = saveFlightAction.bind(null, investigationId);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  // Controlled, not defaultValue — see NarrativeForm.tsx for why.
  const [flightRules, setFlightRules] = useState(flight?.flightRules ?? "");

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {state.error && <ErrorBanner message={state.error} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Flight Number (optional)" name="flightNumber" defaultValue={flight?.flightNumber ?? undefined} disabled={readOnly} />
        <div className="flex flex-col gap-1">
          <label htmlFor="flightRules" className="text-sm text-muted">Flight Rules</label>
          <select id="flightRules" name="flightRules" required disabled={readOnly} value={flightRules} onChange={(e) => setFlightRules(e.target.value)} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60">
            <option value="" disabled>Select flight rules</option>
            <option value="VFR">VFR</option>
            <option value="IFR">IFR</option>
          </select>
        </div>
        <FormField label="Departure Aerodrome" name="departureAerodrome" defaultValue={flight?.departureAerodrome} required disabled={readOnly} />
        <FormField label="Destination Aerodrome" name="destinationAerodrome" defaultValue={flight?.destinationAerodrome} required disabled={readOnly} />
        <FormField label="Alternate Aerodrome (optional)" name="alternateAerodrome" defaultValue={flight?.alternateAerodrome ?? undefined} disabled={readOnly} />
        <FormField label="PIC Name" name="picName" defaultValue={flight?.picName} required disabled={readOnly} />
        <FormField label="PIC License Number (optional)" name="picLicenseNumber" defaultValue={flight?.picLicenseNumber ?? undefined} disabled={readOnly} />
        <FormField label="Crew Complement" name="crewComplement" type="number" defaultValue={flight?.crewComplement ?? 1} required disabled={readOnly} />
      </div>
      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </div>
      )}
    </form>
  );
}
