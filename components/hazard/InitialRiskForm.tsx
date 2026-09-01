"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Hazard } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { saveHazardAction, type HazardActionState } from "@/lib/actions/hazard";

const HAZARD_CATEGORIES = ["HumanFactors", "Technical", "Environmental", "Organizational", "Other"];
const HAZARD_CATEGORY_LABELS: Record<string, string> = {
  HumanFactors: "Human Factors",
  Technical: "Technical",
  Environmental: "Environmental",
  Organizational: "Organizational",
  Other: "Other",
};
const LIKELIHOODS = ["Rare", "Unlikely", "Possible", "Likely", "AlmostCertain"];
const SEVERITIES = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

const INITIAL_STATE: HazardActionState = { error: null };

/** FR-029 — Add/Edit Hazard (Description, Category, Initial Risk). */
export function InitialRiskForm({
  investigationId,
  hazard,
  onDone,
}: {
  investigationId: number;
  hazard: Hazard | null;
  onDone: () => void;
}) {
  const action = saveHazardAction.bind(null, investigationId, hazard?.id ?? null);
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
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-muted">Description</label>
        <textarea
          id="description"
          name="description"
          required
          rows={2}
          defaultValue={hazard?.description ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="hazardCategory" className="text-sm text-muted">Category</label>
          <select
            id="hazardCategory"
            name="hazardCategory"
            required
            defaultValue={hazard?.hazardCategory ?? ""}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="" disabled>Select category</option>
            {HAZARD_CATEGORIES.map((c) => (
              <option key={c} value={c}>{HAZARD_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="initialLikelihood" className="text-sm text-muted">Initial Likelihood</label>
          <select
            id="initialLikelihood"
            name="initialLikelihood"
            required
            defaultValue={hazard?.initialLikelihood ?? ""}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="" disabled>Select likelihood</option>
            {LIKELIHOODS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="initialSeverity" className="text-sm text-muted">Initial Severity</label>
          <select
            id="initialSeverity"
            name="initialSeverity"
            required
            defaultValue={hazard?.initialSeverity ?? ""}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="" disabled>Select severity</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
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
