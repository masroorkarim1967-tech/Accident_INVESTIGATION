"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ContributingFactor, Hazard } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuggestionChip } from "@/components/ui/SuggestionChip";
import {
  saveContributingFactorAction,
  removeContributingFactorAction,
  generateContributingFactorSuggestionsAction,
  type ContributingFactorActionState,
} from "@/lib/actions/contributingFactor";
import type { ContributingFactorSuggestion } from "@/lib/services/suggestContributingFactor";

const FACTOR_CATEGORIES = [
  "HumanFactors", "Equipment", "Environment", "Procedures", "Training",
  "Supervision", "Communication", "Organization", "Management", "ExternalFactors",
];
const FACTOR_CATEGORY_LABELS: Record<string, string> = {
  HumanFactors: "Human Factors",
  Equipment: "Equipment",
  Environment: "Environment",
  Procedures: "Procedures",
  Training: "Training",
  Supervision: "Supervision",
  Communication: "Communication",
  Organization: "Organization",
  Management: "Management",
  ExternalFactors: "External Factors",
};

const INITIAL_STATE: ContributingFactorActionState = { error: null };

export type ContributingFactorWithLinks = ContributingFactor & { hazardLinks: { hazardId: number }[] };

function ContributingFactorForm({
  investigationId,
  factor,
  hazards,
  prefill,
  onDone,
}: {
  investigationId: number;
  factor: ContributingFactorWithLinks | null;
  hazards: Hazard[];
  prefill?: { description: string; category: string } | null;
  onDone: () => void;
}) {
  const action = saveContributingFactorAction.bind(null, investigationId, factor?.id ?? null);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [selectedHazardIds, setSelectedHazardIds] = useState<number[]>(
    factor?.hazardLinks.map((l) => l.hazardId) ?? [],
  );

  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function toggleHazard(hazardId: number) {
    setSelectedHazardIds((prev) => (prev.includes(hazardId) ? prev.filter((id) => id !== hazardId) : [...prev, hazardId]));
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      {state.error && <ErrorBanner message={state.error} />}
      {selectedHazardIds.map((id) => (
        <input key={id} type="hidden" name="hazardIds" value={id} />
      ))}
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-muted">Description</label>
        <textarea
          id="description"
          name="description"
          required
          rows={2}
          defaultValue={prefill?.description ?? factor?.description ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm text-muted">Category</label>
        <select
          id="category"
          name="category"
          required
          defaultValue={prefill?.category ?? factor?.category ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="" disabled>Select category</option>
          {FACTOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>{FACTOR_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>
      {hazards.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">Linked Hazards (optional)</p>
          <div className="flex flex-col gap-1">
            {hazards.map((h) => (
              <label key={h.id} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={selectedHazardIds.includes(h.id)}
                  onChange={() => toggleHazard(h.id)}
                />
                {h.description}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function ContributingFactorPanel({
  investigationId,
  factors,
  hazards,
  readOnly,
}: {
  investigationId: number;
  factors: ContributingFactorWithLinks[];
  hazards: Hazard[];
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [prefill, setPrefill] = useState<{ description: string; category: string } | null>(null);
  const [suggestions, setSuggestions] = useState<ContributingFactorSuggestion[] | null>(null);
  const [suggestPending, setSuggestPending] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // ui-spec.md §12: list grouped by Category (FR-031).
  const grouped = useMemo(() => {
    const map = new Map<string, ContributingFactorWithLinks[]>();
    for (const factor of factors) {
      const list = map.get(factor.category) ?? [];
      list.push(factor);
      map.set(factor.category, list);
    }
    return map;
  }, [factors]);

  async function handleRemove(factorId: number) {
    await removeContributingFactorAction(investigationId, factorId);
  }

  async function handleSuggest() {
    setSuggestPending(true);
    setSuggestError(null);
    const result = await generateContributingFactorSuggestionsAction(investigationId);
    setSuggestPending(false);
    if (result.error) {
      setSuggestError(result.error);
    } else if (result.suggestions.length === 0) {
      setSuggestError("No similar past investigations found.");
    } else {
      setSuggestions(result.suggestions);
    }
  }

  function acceptSuggestion(suggestion: ContributingFactorSuggestion) {
    setPrefill({ description: suggestion.description, category: suggestion.category });
    setSuggestions((prev) => prev?.filter((s) => s !== suggestion) ?? null);
    setEditingId("new");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {factors.length === 0 ? (
        <p className="text-sm text-muted">No contributing factors identified yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase text-muted">{FACTOR_CATEGORY_LABELS[category]}</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {items.map((factor) => (
                  <li key={factor.id} className="flex items-start justify-between gap-2 rounded border border-border bg-surface p-3">
                    <p className="text-sm text-foreground">{factor.description}</p>
                    {!readOnly && (
                      <div className="flex flex-shrink-0 gap-2">
                        <button type="button" onClick={() => setEditingId(factor.id)} className="text-xs text-teal hover:underline">Edit</button>
                        <button type="button" onClick={() => handleRemove(factor.id)} className="text-xs text-red hover:underline">Remove</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div>
          <Button type="button" variant="ghost" onClick={handleSuggest} disabled={suggestPending}>
            {suggestPending ? "Analyzing…" : "Find Potential Contributing Factors"}
          </Button>
          {suggestError && <p className="mt-2 text-xs text-muted">{suggestError}</p>}
          {suggestions && suggestions.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {suggestions.map((s, i) => (
                <SuggestionChip
                  key={i}
                  label="Investigation Support · Potential Contributing Factor"
                  onAccept={() => acceptSuggestion(s)}
                  onDismiss={() => setSuggestions((prev) => prev?.filter((x) => x !== s) ?? null)}
                >
                  <p>{s.description}</p>
                  <p className="mt-1 text-xs text-muted">
                    {FACTOR_CATEGORY_LABELS[s.category]} · from {s.sourceReferenceNumber}
                  </p>
                </SuggestionChip>
              ))}
            </div>
          )}
        </div>
      )}

      {!readOnly && editingId !== "new" && (
        <div>
          <Button type="button" variant="secondary" onClick={() => { setPrefill(null); setEditingId("new"); }}>
            + Add Contributing Factor
          </Button>
        </div>
      )}

      {!readOnly && editingId === "new" && (
        <ContributingFactorForm
          investigationId={investigationId}
          factor={null}
          hazards={hazards}
          prefill={prefill}
          onDone={() => { setEditingId(null); setPrefill(null); }}
        />
      )}
      {!readOnly && typeof editingId === "number" && (
        <ContributingFactorForm
          investigationId={investigationId}
          factor={factors.find((f) => f.id === editingId) ?? null}
          hazards={hazards}
          onDone={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
