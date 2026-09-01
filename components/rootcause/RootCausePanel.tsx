"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { RootCause } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfidenceLevelBadge } from "./ConfidenceLevelBadge";
import { SupportingEvidencePicker, type EvidenceReference, type WitnessReference } from "./SupportingEvidencePicker";
import { saveRootCauseAction, removeRootCauseAction, type RootCauseActionState } from "@/lib/actions/rootCause";

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
const CONFIDENCE_LEVELS = ["Low", "Medium", "High"];

const INITIAL_STATE: RootCauseActionState = { error: null };

export type RootCauseWithLinks = RootCause & { contributingFactorLinks: { contributingFactorId: number }[] };
export interface FiveWhysAnalysisOption {
  id: number;
  problemStatement: string;
  linkedRootCauseId: number | null;
}
export interface ContributingFactorOption {
  id: number;
  description: string;
}

function RootCauseForm({
  investigationId,
  rootCause,
  fiveWhysAnalyses,
  contributingFactors,
  evidence,
  witnesses,
  preselectedFiveWhysAnalysisId,
  onDone,
}: {
  investigationId: number;
  rootCause: RootCauseWithLinks | null;
  fiveWhysAnalyses: FiveWhysAnalysisOption[];
  contributingFactors: ContributingFactorOption[];
  evidence: EvidenceReference[];
  witnesses: WitnessReference[];
  preselectedFiveWhysAnalysisId?: number | null;
  onDone: () => void;
}) {
  const action = saveRootCauseAction.bind(null, investigationId, rootCause?.id ?? null);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [isInconclusive, setIsInconclusive] = useState(rootCause?.isInconclusive ?? false);
  const [selectedFactorIds, setSelectedFactorIds] = useState<number[]>(
    rootCause?.contributingFactorLinks.map((l) => l.contributingFactorId) ?? [],
  );
  const supportingEvidenceRef = useRef<HTMLTextAreaElement>(null);

  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const availableAnalyses = fiveWhysAnalyses.filter(
    (a) => a.linkedRootCauseId === null || a.linkedRootCauseId === rootCause?.id,
  );

  function toggleFactor(id: number) {
    setSelectedFactorIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  function insertCitation(text: string) {
    const el = supportingEvidenceRef.current;
    if (!el) return;
    el.value = el.value ? `${el.value}\n${text}` : text;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      {state.error && <ErrorBanner message={state.error} />}
      <input type="hidden" name="isInconclusive" value={String(isInconclusive)} />
      {selectedFactorIds.map((id) => (
        <input key={id} type="hidden" name="contributingFactorIds" value={id} />
      ))}

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={isInconclusive} onChange={(e) => setIsInconclusive(e.target.checked)} />
        Root cause could not be conclusively identified
      </label>

      {isInconclusive ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="inconclusiveJustification" className="text-sm text-muted">
            Justification (minimum 20 characters)
          </label>
          <textarea
            id="inconclusiveJustification"
            name="inconclusiveJustification"
            required
            rows={3}
            defaultValue={rootCause?.inconclusiveJustification ?? ""}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {state.fieldErrors?.inconclusiveJustification && (
            <p className="text-xs text-red">{state.fieldErrors.inconclusiveJustification}</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm text-muted">Potential Root Cause</label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={rootCause?.description ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            {state.fieldErrors?.description && <p className="text-xs text-red">{state.fieldErrors.description}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="category" className="text-sm text-muted">Category</label>
            <select
              id="category"
              name="category"
              defaultValue={rootCause?.category ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="" disabled>Select category</option>
              {FACTOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>{FACTOR_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            {state.fieldErrors?.category && <p className="text-xs text-red">{state.fieldErrors.category}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="supportingEvidence" className="text-sm text-muted">
              Supporting Evidence (or an explicit acknowledgment none is available yet)
            </label>
            <textarea
              id="supportingEvidence"
              name="supportingEvidence"
              ref={supportingEvidenceRef}
              rows={3}
              defaultValue={rootCause?.supportingEvidence ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            {state.fieldErrors?.supportingEvidence && <p className="text-xs text-red">{state.fieldErrors.supportingEvidence}</p>}
            <SupportingEvidencePicker evidence={evidence} witnesses={witnesses} onInsert={insertCitation} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confidenceLevel" className="text-sm text-muted">Confidence Level</label>
            <select
              id="confidenceLevel"
              name="confidenceLevel"
              defaultValue={rootCause?.confidenceLevel ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="" disabled>Select confidence level</option>
              {CONFIDENCE_LEVELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {state.fieldErrors?.confidenceLevel && <p className="text-xs text-red">{state.fieldErrors.confidenceLevel}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="investigatorNotes" className="text-sm text-muted">Investigator Notes (optional)</label>
            <textarea
              id="investigatorNotes"
              name="investigatorNotes"
              rows={2}
              defaultValue={rootCause?.investigatorNotes ?? ""}
              className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          {availableAnalyses.length > 0 && (
            <div className="flex flex-col gap-1">
              <label htmlFor="fiveWhysAnalysisId" className="text-sm text-muted">Concludes 5 Whys Analysis (optional)</label>
              <select
                id="fiveWhysAnalysisId"
                name="fiveWhysAnalysisId"
                defaultValue={
                  rootCause?.fiveWhysAnalysisId
                    ? String(rootCause.fiveWhysAnalysisId)
                    : preselectedFiveWhysAnalysisId
                      ? String(preselectedFiveWhysAnalysisId)
                      : ""
                }
                className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">None</option>
                {availableAnalyses.map((a) => (
                  <option key={a.id} value={a.id}>{a.problemStatement}</option>
                ))}
              </select>
            </div>
          )}
          {contributingFactors.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted">Linked Contributing Factors (optional)</p>
              {contributingFactors.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={selectedFactorIds.includes(f.id)} onChange={() => toggleFactor(f.id)} />
                  {f.description}
                </label>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

function RootCauseCard({
  rootCause,
  fiveWhysAnalyses,
  contributingFactors,
  readOnly,
  onEdit,
  onRemove,
}: {
  rootCause: RootCauseWithLinks;
  fiveWhysAnalyses: FiveWhysAnalysisOption[];
  contributingFactors: ContributingFactorOption[];
  readOnly: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const linkedAnalysis = fiveWhysAnalyses.find((a) => a.id === rootCause.fiveWhysAnalysisId);
  const linkedFactors = contributingFactors.filter((f) =>
    rootCause.contributingFactorLinks.some((l) => l.contributingFactorId === f.id),
  );

  return (
    <li
      className={`flex flex-col gap-3 rounded border p-4 ${
        rootCause.isInconclusive ? "border-amber bg-amber/5" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${rootCause.isInconclusive ? "text-amber" : "text-teal"}`}
        >
          {rootCause.isInconclusive ? "Inconclusive" : "Potential Root Cause"}
        </p>
        {!readOnly && (
          <div className="flex flex-shrink-0 gap-2">
            <button type="button" onClick={onEdit} className="text-xs text-teal hover:underline">Edit</button>
            <button type="button" onClick={onRemove} className="text-xs text-red hover:underline">Remove</button>
          </div>
        )}
      </div>

      {rootCause.isInconclusive ? (
        <div>
          <p className="text-sm font-medium text-foreground">Root cause could not be conclusively identified</p>
          <p className="mt-1 text-sm text-muted">{rootCause.inconclusiveJustification}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">{rootCause.description}</p>
          <p className="text-xs text-muted">
            {rootCause.category ? FACTOR_CATEGORY_LABELS[rootCause.category] : null}
          </p>

          <div className="rounded border border-border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted">Investigator Assessment</p>
            <div className="mt-2">
              <ConfidenceLevelBadge confidenceLevel={rootCause.confidenceLevel} />
            </div>
            <p className="mt-2 text-xs uppercase text-muted">Supporting Evidence</p>
            <p className="text-sm text-foreground">{rootCause.supportingEvidence}</p>
            {rootCause.investigatorNotes && (
              <>
                <p className="mt-2 text-xs uppercase text-muted">Investigator Notes</p>
                <p className="text-sm text-foreground">{rootCause.investigatorNotes}</p>
              </>
            )}
          </div>

          {linkedAnalysis && <p className="text-xs text-muted">5 Whys: {linkedAnalysis.problemStatement}</p>}
          {linkedFactors.length > 0 && (
            <p className="text-xs text-muted">Contributing Factors: {linkedFactors.map((f) => f.description).join("; ")}</p>
          )}
        </div>
      )}
    </li>
  );
}

export function RootCausePanel({
  investigationId,
  rootCauses,
  fiveWhysAnalyses,
  contributingFactors,
  evidence,
  witnesses,
  preselectedFiveWhysAnalysisId,
  readOnly,
}: {
  investigationId: number;
  rootCauses: RootCauseWithLinks[];
  fiveWhysAnalyses: FiveWhysAnalysisOption[];
  contributingFactors: ContributingFactorOption[];
  evidence: EvidenceReference[];
  witnesses: WitnessReference[];
  preselectedFiveWhysAnalysisId?: number | null;
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(preselectedFiveWhysAnalysisId ? "new" : null);

  async function handleRemove(rootCauseId: number) {
    await removeRootCauseAction(investigationId, rootCauseId);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {rootCauses.length === 0 ? (
        <p className="text-sm text-muted">No potential root causes recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rootCauses.map((rc) => (
            <RootCauseCard
              key={rc.id}
              rootCause={rc}
              fiveWhysAnalyses={fiveWhysAnalyses}
              contributingFactors={contributingFactors}
              readOnly={readOnly}
              onEdit={() => setEditingId(rc.id)}
              onRemove={() => handleRemove(rc.id)}
            />
          ))}
        </ul>
      )}

      {!readOnly && editingId !== "new" && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setEditingId("new")}>+ Add Potential Root Cause</Button>
        </div>
      )}

      {!readOnly && editingId === "new" && (
        <RootCauseForm
          investigationId={investigationId}
          rootCause={null}
          fiveWhysAnalyses={fiveWhysAnalyses}
          contributingFactors={contributingFactors}
          evidence={evidence}
          witnesses={witnesses}
          preselectedFiveWhysAnalysisId={preselectedFiveWhysAnalysisId}
          onDone={() => setEditingId(null)}
        />
      )}
      {!readOnly && typeof editingId === "number" && (
        <RootCauseForm
          investigationId={investigationId}
          rootCause={rootCauses.find((rc) => rc.id === editingId) ?? null}
          fiveWhysAnalyses={fiveWhysAnalyses}
          contributingFactors={contributingFactors}
          evidence={evidence}
          witnesses={witnesses}
          onDone={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
