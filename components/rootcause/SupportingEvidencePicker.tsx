"use client";

import { useState } from "react";

export interface EvidenceReference {
  id: number;
  evidenceType: string;
  description: string;
}

export interface WitnessReference {
  id: number;
  name: string;
  statementSummary: string;
}

/**
 * FR-038 — Supporting Evidence is a free-text field (data-model.md
 * §3.17), not a formal link to recorded Evidence/Witness rows. This
 * component is a browsing aid: it surfaces what's already on file for
 * this investigation (Phase 6) so the investigator can cite specific
 * items by inserting a short reference into the text they're composing,
 * without requiring a new join table.
 */
export function SupportingEvidencePicker({
  evidence,
  witnesses,
  onInsert,
}: {
  evidence: EvidenceReference[];
  witnesses: WitnessReference[];
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (evidence.length === 0 && witnesses.length === 0) {
    return null;
  }

  return (
    <div className="rounded border border-border bg-background p-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-teal hover:underline">
        {open ? "Hide" : "Browse"} recorded Evidence &amp; Witnesses to cite
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {evidence.map((item) => (
            <li key={`evidence-${item.id}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-muted">
                Evidence #{item.id} · {item.evidenceType} — {item.description}
              </span>
              <button
                type="button"
                onClick={() => onInsert(`Evidence #${item.id} (${item.evidenceType}): ${item.description}`)}
                className="flex-shrink-0 text-teal hover:underline"
              >
                Cite
              </button>
            </li>
          ))}
          {witnesses.map((item) => (
            <li key={`witness-${item.id}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-muted">
                Witness #{item.id} · {item.name} — {item.statementSummary}
              </span>
              <button
                type="button"
                onClick={() => onInsert(`Witness #${item.id} (${item.name}): ${item.statementSummary}`)}
                className="flex-shrink-0 text-teal hover:underline"
              >
                Cite
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
