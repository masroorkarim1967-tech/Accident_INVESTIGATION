"use client";

import { useActionState, useState } from "react";
import type { Aircraft } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FormField } from "@/components/ui/FormField";
import { saveAircraftAction, type AircraftActionState } from "@/lib/actions/aircraft";

const DAMAGE_LEVELS = ["None", "Minor", "Substantial", "Destroyed"];
const INITIAL_STATE: AircraftActionState = { error: null };

export function AircraftForm({
  investigationId,
  aircraft,
  readOnly,
}: {
  investigationId: number;
  aircraft: Aircraft | null;
  readOnly: boolean;
}) {
  const action = saveAircraftAction.bind(null, investigationId);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  // Controlled, not defaultValue — see NarrativeForm.tsx for why (React
  // resets uncontrolled <select> fields to their first option after a
  // successful action, silently blocking the next save).
  const [damageLevel, setDamageLevel] = useState<string>(aircraft?.damageLevel ?? "None");

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {state.error && <ErrorBanner message={state.error} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Registration" name="registration" defaultValue={aircraft?.registration} required disabled={readOnly} />
        <FormField label="Manufacturer" name="manufacturer" defaultValue={aircraft?.manufacturer} required disabled={readOnly} />
        <FormField label="Model" name="model" defaultValue={aircraft?.model} required disabled={readOnly} />
        <FormField label="Serial Number (optional)" name="serialNumber" defaultValue={aircraft?.serialNumber ?? undefined} disabled={readOnly} />
        <FormField label="Year of Manufacture (optional)" name="yearOfManufacture" type="number" defaultValue={aircraft?.yearOfManufacture ?? undefined} disabled={readOnly} />
        <FormField label="Operator Name" name="operatorName" defaultValue={aircraft?.operatorName} required disabled={readOnly} />
        <FormField label="Engine Type (optional)" name="engineType" defaultValue={aircraft?.engineType ?? undefined} disabled={readOnly} />
        <FormField label="Engine Count" name="engineCount" type="number" defaultValue={aircraft?.engineCount ?? 1} required disabled={readOnly} />
        <div className="flex flex-col gap-1">
          <label htmlFor="damageLevel" className="text-sm text-muted">Damage Level</label>
          <select id="damageLevel" name="damageLevel" required disabled={readOnly} value={damageLevel} onChange={(e) => setDamageLevel(e.target.value)} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60">
            {DAMAGE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
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

