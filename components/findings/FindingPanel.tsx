"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FindingCard, type FindingCardData } from "./FindingCard";
import { CitationPicker } from "./CitationPicker";
import { saveFindingAction, removeFindingAction, type FindingActionState } from "@/lib/actions/finding";

const FINDING_TYPES = ["Cause", "ContributingFactor", "RiskObservation", "Other"];
const FINDING_TYPE_LABELS: Record<string, string> = {
  Cause: "Cause",
  ContributingFactor: "Contributing Factor",
  RiskObservation: "Risk Observation",
  Other: "Other",
};

const INITIAL_STATE: FindingActionState = { error: null };

export interface FindingFormRow {
  id: number;
  findingType: string;
  description: string;
  hazardIds: number[];
  contributingFactorIds: number[];
  rootCauseIds: number[];
}

function FindingForm({
  investigationId,
  finding,
  hazards,
  contributingFactors,
  rootCauses,
  onDone,
}: {
  investigationId: number;
  finding: FindingFormRow | null;
  hazards: { id: number; description: string }[];
  contributingFactors: { id: number; description: string }[];
  rootCauses: { id: number; description: string }[];
  onDone: () => void;
}) {
  const boundAction = saveFindingAction.bind(null, investigationId, finding?.id ?? null);
  const [state, formAction, pending] = useActionState(boundAction, INITIAL_STATE);
  const [hazardIds, setHazardIds] = useState<number[]>(finding?.hazardIds ?? []);
  const [contributingFactorIds, setContributingFactorIds] = useState<number[]>(finding?.contributingFactorIds ?? []);
  const [rootCauseIds, setRootCauseIds] = useState<number[]>(finding?.rootCauseIds ?? []);

  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function toggle(setter: React.Dispatch<React.SetStateAction<number[]>>) {
    return (id: number) => setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      {state.error && <ErrorBanner message={state.error} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="findingType" className="text-sm text-muted">Finding Type</label>
        <select
          id="findingType"
          name="findingType"
          required
          defaultValue={finding?.findingType ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="" disabled>Select type</option>
          {FINDING_TYPES.map((t) => (
            <option key={t} value={t}>{FINDING_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-muted">Description (minimum 20 characters)</label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={finding?.description ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        {state.fieldErrors?.description && <p className="text-xs text-red">{state.fieldErrors.description}</p>}
      </div>

      <p className="text-sm text-muted">Cite related analysis</p>
      <CitationPicker label="Hazards" name="hazardIds" items={hazards} selectedIds={hazardIds} onToggle={toggle(setHazardIds)} />
      <CitationPicker
        label="Contributing Factors"
        name="contributingFactorIds"
        items={contributingFactors}
        selectedIds={contributingFactorIds}
        onToggle={toggle(setContributingFactorIds)}
      />
      <CitationPicker
        label="Root Causes"
        name="rootCauseIds"
        items={rootCauses}
        selectedIds={rootCauseIds}
        onToggle={toggle(setRootCauseIds)}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function FindingPanel({
  investigationId,
  findings,
  hazards,
  contributingFactors,
  rootCauses,
  readOnly,
}: {
  investigationId: number;
  findings: (FindingCardData & FindingFormRow)[];
  hazards: { id: number; description: string }[];
  contributingFactors: { id: number; description: string }[];
  rootCauses: { id: number; description: string }[];
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);

  async function handleRemove(findingId: number) {
    await removeFindingAction(investigationId, findingId);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {findings.length === 0 ? (
        <p className="text-sm text-muted">No findings recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              readOnly={readOnly}
              onEdit={() => setEditingId(finding.id)}
              onRemove={() => handleRemove(finding.id)}
            />
          ))}
        </ul>
      )}

      {!readOnly && editingId !== "new" && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setEditingId("new")}>+ Add Finding</Button>
        </div>
      )}

      {!readOnly && editingId === "new" && (
        <FindingForm
          investigationId={investigationId}
          finding={null}
          hazards={hazards}
          contributingFactors={contributingFactors}
          rootCauses={rootCauses}
          onDone={() => setEditingId(null)}
        />
      )}
      {!readOnly && typeof editingId === "number" && (
        <FindingForm
          investigationId={investigationId}
          finding={findings.find((f) => f.id === editingId) ?? null}
          hazards={hazards}
          contributingFactors={contributingFactors}
          rootCauses={rootCauses}
          onDone={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
