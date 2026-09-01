"use client";

import { useActionState, useState } from "react";
import type { Location } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FormField } from "@/components/ui/FormField";
import { saveLocationAction, type LocationActionState } from "@/lib/actions/location";

const INITIAL_STATE: LocationActionState = { error: null };

export function LocationForm({
  investigationId,
  location,
  readOnly,
}: {
  investigationId: number;
  location: Location | null;
  readOnly: boolean;
}) {
  const action = saveLocationAction.bind(null, investigationId);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  // Controlled, not defaultValue — see NarrativeForm.tsx for why.
  const [lightingConditions, setLightingConditions] = useState(location?.lightingConditions ?? "");

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {state.error && <ErrorBanner message={state.error} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="locationDescription" className="text-sm text-muted">Location Description</label>
        <textarea
          id="locationDescription"
          name="locationDescription"
          required
          rows={2}
          disabled={readOnly}
          defaultValue={location?.locationDescription ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Latitude (optional)" name="latitude" type="number" defaultValue={location?.latitude ? Number(location.latitude) : undefined} disabled={readOnly} />
        <FormField label="Longitude (optional)" name="longitude" type="number" defaultValue={location?.longitude ? Number(location.longitude) : undefined} disabled={readOnly} />
        <FormField label="Aerodrome Code (optional)" name="aerodromeCode" defaultValue={location?.aerodromeCode ?? undefined} disabled={readOnly} />
        <FormField label="Runway in Use (optional)" name="runwayInUse" defaultValue={location?.runwayInUse ?? undefined} disabled={readOnly} />
        <FormField label="Weather Visibility (optional)" name="weatherVisibility" defaultValue={location?.weatherVisibility ?? undefined} disabled={readOnly} />
        <FormField label="Wind Speed, kt (optional)" name="windSpeedKt" type="number" defaultValue={location?.windSpeedKt ?? undefined} disabled={readOnly} />
        <FormField label="Wind Direction, deg (optional)" name="windDirectionDeg" type="number" defaultValue={location?.windDirectionDeg ?? undefined} disabled={readOnly} />
        <FormField label="Cloud Cover (optional)" name="cloudCover" defaultValue={location?.cloudCover ?? undefined} disabled={readOnly} />
        <FormField label="Temperature, °C (optional)" name="temperatureC" type="number" defaultValue={location?.temperatureC ?? undefined} disabled={readOnly} />
        <FormField label="Precipitation (optional)" name="precipitation" defaultValue={location?.precipitation ?? undefined} disabled={readOnly} />
        <FormField label="Terrain Type (optional)" name="terrainType" defaultValue={location?.terrainType ?? undefined} disabled={readOnly} />
        <div className="flex flex-col gap-1">
          <label htmlFor="lightingConditions" className="text-sm text-muted">Lighting Conditions</label>
          <select id="lightingConditions" name="lightingConditions" required disabled={readOnly} value={lightingConditions} onChange={(e) => setLightingConditions(e.target.value)} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60">
            <option value="" disabled>Select lighting conditions</option>
            {["Day", "Night", "Dusk", "Dawn"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </div>
      )}
    </form>
  );
}
