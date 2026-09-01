"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Hazard } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { saveHazardResidualRiskAction, type HazardActionState } from "@/lib/actions/hazard";

const LIKELIHOODS = ["Rare", "Unlikely", "Possible", "Likely", "AlmostCertain"];
const SEVERITIES = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

const INITIAL_STATE: HazardActionState = { error: null };

/** FR-068 — Existing Controls and Residual Risk, saved independently of Initial Risk. */
export function ResidualRiskForm({ investigationId, hazard }: { investigationId: number; hazard: Hazard }) {
  const action = saveHazardResidualRiskAction.bind(null, investigationId, hazard.id);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [dismissedWarning, setDismissedWarning] = useState(false);

  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    setDismissedWarning(false);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-border bg-background p-3">
      {state.error && <ErrorBanner message={state.error} />}
      {state.warning && !dismissedWarning && (
        <div className="flex items-start justify-between gap-2 rounded border border-amber bg-amber/10 px-3 py-2 text-xs text-amber">
          <span>{state.warning}</span>
          <button type="button" onClick={() => setDismissedWarning(true)} className="flex-shrink-0 hover:underline">
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor={`existingControls-${hazard.id}`} className="text-xs text-muted">Existing Controls (optional)</label>
        <textarea
          id={`existingControls-${hazard.id}`}
          name="existingControls"
          rows={2}
          defaultValue={hazard.existingControls ?? ""}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`residualLikelihood-${hazard.id}`} className="text-xs text-muted">Residual Likelihood</label>
          <select
            id={`residualLikelihood-${hazard.id}`}
            name="residualLikelihood"
            defaultValue={hazard.residualLikelihood ?? ""}
            className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="">Not yet assessed</option>
            {LIKELIHOODS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`residualSeverity-${hazard.id}`} className="text-xs text-muted">Residual Severity</label>
          <select
            id={`residualSeverity-${hazard.id}`}
            name="residualSeverity"
            defaultValue={hazard.residualSeverity ?? ""}
            className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="">Not yet assessed</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {state.fieldErrors?.residualSeverity && <p className="text-xs text-red">{state.fieldErrors.residualSeverity}</p>}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save Residual Risk"}
        </Button>
      </div>
    </form>
  );
}
