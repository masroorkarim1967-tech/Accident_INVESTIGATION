"use client";

import { useActionState, useMemo, useState } from "react";
import type { Occurrence, OccurrenceSubcategoryOption } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { SuggestionChip } from "@/components/ui/SuggestionChip";
import {
  saveOccurrenceClassificationAction,
  saveOccurrenceOutcomeAction,
  overrideOccurrenceFieldAction,
  generateClassificationSuggestionAction,
  type OccurrenceActionState,
} from "@/lib/actions/occurrence";
import type { ClassificationSuggestion } from "@/lib/services/investigationSupportEngine/suggestClassification";
import { SUPPORT_LABELS } from "@/lib/services/investigationSupportEngine/labels";

const CATEGORIES = [
  "AircraftIncident", "GroundHandlingIncident", "RampSafetyIncident", "BaggageIncident", "CargoIncident",
  "DangerousGoodsIncident", "PassengerHandlingIncident", "SecurityRelatedOccurrence", "OccupationalSafetyIncident",
  "EquipmentVehicleIncident", "MaintenanceRelatedOccurrence", "EnvironmentalOccurrence", "NearMiss", "Other",
];
const CATEGORY_LABELS: Record<string, string> = {
  AircraftIncident: "Aircraft Incident",
  GroundHandlingIncident: "Ground Handling Incident",
  RampSafetyIncident: "Ramp Safety Incident",
  BaggageIncident: "Baggage Incident",
  CargoIncident: "Cargo Incident",
  DangerousGoodsIncident: "Dangerous Goods Incident",
  PassengerHandlingIncident: "Passenger Handling Incident",
  SecurityRelatedOccurrence: "Security-Related Occurrence",
  OccupationalSafetyIncident: "Occupational Safety Incident",
  EquipmentVehicleIncident: "Equipment/Vehicle Incident",
  MaintenanceRelatedOccurrence: "Maintenance-Related Occurrence",
  EnvironmentalOccurrence: "Environmental Occurrence",
  NearMiss: "Near Miss",
  Other: "Other",
};
const SEVERITIES = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];
const LIKELIHOODS = ["Rare", "Unlikely", "Possible", "Likely", "AlmostCertain"];

const INITIAL_STATE: OccurrenceActionState = { error: null };

export function ClassificationPanel({
  investigationId,
  occurrence,
  subcategories,
  readOnly,
}: {
  investigationId: number;
  occurrence: Occurrence;
  subcategories: OccurrenceSubcategoryOption[];
  readOnly: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState(occurrence.occurrenceCategory ?? "");
  // Controlled, not defaultValue — React resets uncontrolled <select> fields
  // to their first option after a successful form action (no <option> ever
  // carries the HTML `selected` attribute), which silently blocked every
  // save after the first via native required-field validation, with no
  // visible error. Found during Phase 5 live browser verification.
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(
    occurrence.occurrenceSubcategoryId != null ? String(occurrence.occurrenceSubcategoryId) : "",
  );
  const [actualOutcomeSeverity, setActualOutcomeSeverity] = useState(occurrence.actualOutcomeSeverity ?? "");
  const [potentialOutcomeSeverity, setPotentialOutcomeSeverity] = useState(occurrence.potentialOutcomeSeverity ?? "");
  const [likelihoodOfRecurrence, setLikelihoodOfRecurrence] = useState(occurrence.likelihoodOfRecurrence ?? "");
  const [suggestion, setSuggestion] = useState<ClassificationSuggestion | null>(null);
  const [suggestionPending, setSuggestionPending] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [acceptedFromSuggestion, setAcceptedFromSuggestion] = useState(false);
  const [showOverride, setShowOverride] = useState<"severity" | "investigationPriority" | null>(null);

  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => s.category === selectedCategory),
    [subcategories, selectedCategory],
  );

  const classificationAction = saveOccurrenceClassificationAction.bind(null, investigationId, acceptedFromSuggestion);
  const [classificationState, classificationFormAction, classificationPending] = useActionState(
    classificationAction,
    INITIAL_STATE,
  );

  const outcomeAction = saveOccurrenceOutcomeAction.bind(null, investigationId);
  const [outcomeState, outcomeFormAction, outcomePending] = useActionState(outcomeAction, INITIAL_STATE);

  const overrideAction = overrideOccurrenceFieldAction.bind(null, investigationId);
  const [overrideState, overrideFormAction, overridePending] = useActionState(overrideAction, INITIAL_STATE);

  async function handleSuggest() {
    setSuggestionPending(true);
    setSuggestionError(null);
    const result = await generateClassificationSuggestionAction(investigationId);
    setSuggestionPending(false);
    if (result.error) {
      setSuggestionError(result.error);
    } else if (!result.suggestion) {
      setSuggestionError("No confident suggestion available — please classify manually.");
    } else {
      setSuggestion(result.suggestion);
    }
  }

  function handleAcceptSuggestion() {
    if (!suggestion) return;
    setSelectedCategory(suggestion.category);
    setSelectedSubcategoryId("");
    setAcceptedFromSuggestion(true);
    setSuggestion(null);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {/* Category / Subcategory */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Category &amp; Subcategory</h2>
        <p className="text-xs text-muted">
          This taxonomy is internally defined for demonstration purposes and does not represent any
          regulator&rsquo;s official classification scheme.
        </p>

        {!readOnly && (
          <div>
            <Button type="button" variant="ghost" onClick={handleSuggest} disabled={suggestionPending}>
              {suggestionPending ? "Analyzing…" : "Suggest Classification"}
            </Button>
            {suggestionError && <p className="mt-2 text-xs text-muted">{suggestionError}</p>}
            {suggestion && (
              <div className="mt-2">
                <SuggestionChip
                  label={SUPPORT_LABELS.suggestedClassification}
                  onAccept={handleAcceptSuggestion}
                  onDismiss={() => setSuggestion(null)}
                >
                  <p>
                    {CATEGORY_LABELS[suggestion.category]} — {suggestion.subcategory}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Confidence: {suggestion.confidence} · Matched: {suggestion.matchedKeywords.join(", ")}
                  </p>
                </SuggestionChip>
              </div>
            )}
          </div>
        )}

        <form action={classificationFormAction} className="flex flex-col gap-3">
          {classificationState.error && <ErrorBanner message={classificationState.error} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="occurrenceCategory" className="text-sm text-muted">Category</label>
              <select
                id="occurrenceCategory"
                name="occurrenceCategory"
                required
                disabled={readOnly}
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategoryId("");
                }}
                className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
              >
                <option value="" disabled>Not yet classified</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="occurrenceSubcategoryId" className="text-sm text-muted">Subcategory</label>
              <select
                id="occurrenceSubcategoryId"
                name="occurrenceSubcategoryId"
                required
                disabled={readOnly || !selectedCategory}
                value={selectedSubcategoryId}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
              >
                <option value="" disabled>Select subcategory</option>
                {filteredSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.subcategory}</option>
                ))}
              </select>
            </div>
          </div>
          {!readOnly && (
            <div className="flex justify-end">
              <Button type="submit" disabled={classificationPending}>
                {classificationPending ? "Saving…" : "Save Classification"}
              </Button>
            </div>
          )}
        </form>
      </section>

      {/* Actual / Potential Outcome */}
      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-foreground">Actual &amp; Potential Outcome</h2>
        <form action={outcomeFormAction} className="flex flex-col gap-3">
          {outcomeState.error && <ErrorBanner message={outcomeState.error} />}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="actualOutcomeSeverity" className="text-sm text-muted">Actual Outcome Severity</label>
              <select
                id="actualOutcomeSeverity"
                name="actualOutcomeSeverity"
                required
                disabled={readOnly}
                value={actualOutcomeSeverity}
                onChange={(e) => setActualOutcomeSeverity(e.target.value)}
                className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
              >
                <option value="" disabled>Select severity</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="potentialOutcomeSeverity" className="text-sm text-muted">Potential Outcome Severity</label>
              <select
                id="potentialOutcomeSeverity"
                name="potentialOutcomeSeverity"
                required
                disabled={readOnly}
                value={potentialOutcomeSeverity}
                onChange={(e) => setPotentialOutcomeSeverity(e.target.value)}
                className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
              >
                <option value="" disabled>Select severity</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {outcomeState.fieldErrors?.potentialOutcomeSeverity && (
                <p className="text-xs text-red">{outcomeState.fieldErrors.potentialOutcomeSeverity}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="actualOutcomeDescription" className="text-sm text-muted">Actual Outcome Description</label>
            <textarea
              id="actualOutcomeDescription"
              name="actualOutcomeDescription"
              required
              rows={3}
              disabled={readOnly}
              defaultValue={occurrence.actualOutcomeDescription ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="potentialOutcomeDescription" className="text-sm text-muted">Potential Outcome Description</label>
            <textarea
              id="potentialOutcomeDescription"
              name="potentialOutcomeDescription"
              required
              rows={3}
              disabled={readOnly}
              defaultValue={occurrence.potentialOutcomeDescription ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="likelihoodOfRecurrence" className="text-sm text-muted">Likelihood of Recurrence</label>
            <select
              id="likelihoodOfRecurrence"
              name="likelihoodOfRecurrence"
              required
              disabled={readOnly}
              value={likelihoodOfRecurrence}
              onChange={(e) => setLikelihoodOfRecurrence(e.target.value)}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
            >
              <option value="" disabled>Select likelihood</option>
              {LIKELIHOODS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {!readOnly && (
            <div className="flex justify-end">
              <Button type="submit" disabled={outcomePending}>
                {outcomePending ? "Saving…" : "Save Outcome"}
              </Button>
            </div>
          )}
        </form>
      </section>

      {/* Computed Severity / Risk / Priority */}
      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-foreground">Computed Severity, Risk &amp; Priority</h2>
        {overrideState.error && <ErrorBanner message={overrideState.error} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-muted">Severity</p>
              <span className="text-xs text-muted">{occurrence.severityOverridden ? "Overridden" : "Computed"}</span>
            </div>
            <p className="mt-1 font-mono text-sm text-foreground">{occurrence.severity ?? "Not yet determined"}</p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowOverride(showOverride === "severity" ? null : "severity")}
                className="mt-2 text-xs text-teal hover:underline"
              >
                Override
              </button>
            )}
          </div>
          <div className="rounded border border-border bg-surface p-3">
            <p className="text-xs uppercase text-muted">Risk Score / Band</p>
            <div className="mt-1">
              <RiskBadge score={occurrence.riskScore} band={occurrence.riskBand} />
            </div>
          </div>
          <div className="rounded border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-muted">Investigation Priority</p>
              <span className="text-xs text-muted">{occurrence.priorityOverridden ? "Overridden" : "Computed"}</span>
            </div>
            <div className="mt-1">
              <PriorityBadge priority={occurrence.investigationPriority} />
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowOverride(showOverride === "investigationPriority" ? null : "investigationPriority")}
                className="mt-2 text-xs text-teal hover:underline"
              >
                Override
              </button>
            )}
          </div>
        </div>

        {showOverride && (
          <form action={overrideFormAction} className="mt-2 flex flex-col gap-2 rounded border border-border bg-surface p-3">
            <input type="hidden" name="field" value={showOverride} />
            {showOverride === "severity" ? (
              <select name="severityValue" required className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <select name="priorityValue" required className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
                {["Routine", "Elevated", "Urgent", "Immediate"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            <textarea
              name="justification"
              placeholder="Justification (minimum 20 characters)"
              required
              rows={2}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowOverride(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={overridePending}>
                {overridePending ? "Saving…" : "Save Override"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
