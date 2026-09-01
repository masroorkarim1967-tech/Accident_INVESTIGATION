"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Evidence } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EvidenceTypeSelect } from "./EvidenceTypeSelect";
import { AttachmentUploader } from "./AttachmentUploader";
import { SimulatedTag } from "./SimulatedTag";
import { saveEvidenceAction, removeEvidenceAction, toggleNoEvidenceAvailableAction, type EvidenceActionState } from "@/lib/actions/evidence";

const ASSESSMENT_LEVELS = ["High", "Medium", "Low"];
const INITIAL_STATE: EvidenceActionState = { error: null };

export type AttachmentSummary = {
  id: number;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  isSimulated: boolean;
  uploadedAt: Date;
};

export type EvidenceWithAttachments = Evidence & { attachments: AttachmentSummary[] };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function EvidenceForm({
  investigationId,
  evidence,
  onDone,
}: {
  investigationId: number;
  evidence: Evidence | null;
  onDone: () => void;
}) {
  const action = saveEvidenceAction.bind(null, investigationId, evidence?.id ?? null);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [evidenceType, setEvidenceType] = useState(evidence?.evidenceType ?? "");

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="evidenceType" className="text-sm text-muted">Evidence Type</label>
          <EvidenceTypeSelect value={evidenceType} onChange={setEvidenceType} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="source" className="text-sm text-muted">Source</label>
          <input id="source" name="source" type="text" required maxLength={200} defaultValue={evidence?.source ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="collectedBy" className="text-sm text-muted">Collected By (optional)</label>
          <input id="collectedBy" name="collectedBy" type="text" maxLength={150} defaultValue={evidence?.collectedBy ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dateObtained" className="text-sm text-muted">Date Obtained (optional)</label>
          <input id="dateObtained" name="dateObtained" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={toDateInputValue(evidence?.dateObtained ?? null)} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
          {state.fieldErrors?.dateObtained && <p className="text-xs text-red">{state.fieldErrors.dateObtained}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="relevance" className="text-sm text-muted">Relevance</label>
          <select id="relevance" name="relevance" required defaultValue={evidence?.relevance ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="" disabled>Select relevance</option>
            {ASSESSMENT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reliabilityAssessment" className="text-sm text-muted">Reliability Assessment</label>
          <select id="reliabilityAssessment" name="reliabilityAssessment" required defaultValue={evidence?.reliabilityAssessment ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="" disabled>Select reliability</option>
            {ASSESSMENT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-muted">Description</label>
        <textarea id="description" name="description" required rows={2} defaultValue={evidence?.description ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reliabilityNotes" className="text-sm text-muted">Reliability Notes (optional)</label>
        <textarea id="reliabilityNotes" name="reliabilityNotes" rows={2} defaultValue={evidence?.reliabilityNotes ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="investigatorNotes" className="text-sm text-muted">Investigator Notes (optional)</label>
        <textarea id="investigatorNotes" name="investigatorNotes" rows={2} defaultValue={evidence?.investigatorNotes ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="custodyNotes" className="text-sm text-muted">Chain-of-Custody Notes (optional)</label>
        <textarea id="custodyNotes" name="custodyNotes" rows={2} defaultValue={evidence?.custodyNotes ?? ""} className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

function EvidenceCard({
  item,
  readOnly,
  onEdit,
  onRemove,
}: {
  item: EvidenceWithAttachments;
  readOnly: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  // CCTVReference records a pointer to footage retained elsewhere (FR-021
  // edge case) — it never carries an uploaded file, so the uploader is
  // hidden entirely for it, not just disabled.
  const canHaveAttachments = item.evidenceType !== "CCTVReference";

  return (
    <li className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{item.evidenceType}</p>
          <p className="text-xs text-muted">
            Relevance: {item.relevance} · Reliability: {item.reliabilityAssessment}
          </p>
        </div>
        {!readOnly && (
          <div className="flex flex-shrink-0 gap-2">
            <button type="button" onClick={onEdit} className="text-xs text-teal hover:underline">Edit</button>
            <button type="button" onClick={onRemove} className="text-xs text-red hover:underline">Remove</button>
          </div>
        )}
      </div>
      <p className="text-sm text-foreground">{item.description}</p>
      <p className="text-xs text-muted">Source: {item.source}</p>

      <p className="text-xs text-muted">Not yet linked to a finding.</p>

      {canHaveAttachments && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {item.attachments.length === 0 ? (
            <p className="text-xs text-muted">No files attached.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {item.attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded border border-border bg-background px-3 py-1.5 text-xs">
                  <a
                    href={`/api/evidence/attachment/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-teal hover:underline"
                  >
                    {a.fileName}
                  </a>
                  <span className="flex flex-shrink-0 items-center gap-2 text-muted">
                    {formatBytes(a.fileSizeBytes)}
                    {a.isSimulated && <SimulatedTag />}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!readOnly && <AttachmentUploader evidenceId={item.id} />}
        </div>
      )}
    </li>
  );
}

export function EvidencePanel({
  investigationId,
  evidence,
  noEvidenceAvailableConfirmed,
  readOnly,
}: {
  investigationId: number;
  evidence: EvidenceWithAttachments[];
  noEvidenceAvailableConfirmed: boolean;
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);

  async function handleToggleNoEvidence() {
    await toggleNoEvidenceAvailableAction(investigationId, !noEvidenceAvailableConfirmed);
  }

  async function handleRemove(evidenceId: number) {
    await removeEvidenceAction(investigationId, evidenceId);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {!readOnly && evidence.length === 0 && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={noEvidenceAvailableConfirmed} onChange={handleToggleNoEvidence} />
          No evidence is currently available for this occurrence
        </label>
      )}

      {noEvidenceAvailableConfirmed ? (
        <p className="text-sm text-foreground">No evidence currently available</p>
      ) : evidence.length === 0 ? (
        <p className="text-sm text-muted">No evidence logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {evidence.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              readOnly={readOnly}
              onEdit={() => setEditingId(item.id)}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </ul>
      )}

      {!readOnly && !noEvidenceAvailableConfirmed && editingId !== "new" && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setEditingId("new")}>+ Add Evidence</Button>
        </div>
      )}

      {!readOnly && editingId === "new" && (
        <EvidenceForm investigationId={investigationId} evidence={null} onDone={() => setEditingId(null)} />
      )}
      {!readOnly && typeof editingId === "number" && (
        <EvidenceForm
          investigationId={investigationId}
          evidence={evidence.find((e) => e.id === editingId) ?? null}
          onDone={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
