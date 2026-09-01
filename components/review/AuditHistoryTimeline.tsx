"use client";

import { useState } from "react";

export interface HistoryEntry {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  performedByName: string;
  reasonText: string | null;
  occurredAt: string;
  relatedReview: { reviewDecision: string; comments: string | null } | null;
}

const EVENT_LABELS: Record<string, string> = {
  Created: "Investigation created",
  InvestigatorAssigned: "Investigator assigned",
  InvestigatorReassigned: "Investigator reassigned",
  StageAdvanced: "Stage advanced",
  SubmittedForReview: "Submitted for review",
  ReviewApproved: "Review: Approved",
  ReviewChangesRequested: "Review: Changes requested",
  Reopened: "Reopened",
  Closed: "Closed",
  DraftDeleted: "Draft deleted",
};

type FilterKey = "all" | "stage" | "review" | "reopen";

const STAGE_EVENTS = new Set(["Created", "InvestigatorAssigned", "InvestigatorReassigned", "StageAdvanced", "SubmittedForReview", "Closed"]);
const REVIEW_EVENTS = new Set(["ReviewApproved", "ReviewChangesRequested"]);
const REOPEN_EVENTS = new Set(["Reopened"]);

/**
 * ui-spec.md §5's History tab / FR-062-064 — a chronological timeline
 * built from InvestigationHistory, which already carries a mirrored
 * summary event for every InvestigationReview decision
 * (data-model.md §3.23), so this renders one merged list, not two.
 */
export function AuditHistoryTimeline({ entries }: { entries: HistoryEntry[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "stage") return STAGE_EVENTS.has(entry.eventType);
    if (filter === "review") return REVIEW_EVENTS.has(entry.eventType);
    if (filter === "reopen") return REOPEN_EVENTS.has(entry.eventType);
    return true;
  });

  if (entries.length === 0) {
    return <p className="text-sm text-muted">No history yet — this investigation was just created.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 text-xs">
        {([
          ["all", "All"],
          ["stage", "Stage changes"],
          ["review", "Reviews"],
          ["reopen", "Reopens"],
        ] as [FilterKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-2.5 py-0.5 ${filter === key ? "border-teal text-teal" : "border-border text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">No matching events.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <li key={entry.id} className="rounded border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{EVENT_LABELS[entry.eventType] ?? entry.eventType}</p>
                <span className="font-mono text-xs text-muted">{new Date(entry.occurredAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {entry.performedByName}
                {entry.fromStatus && entry.toStatus ? ` · ${entry.fromStatus} → ${entry.toStatus}` : ""}
              </p>
              {entry.relatedReview?.comments && <p className="mt-1 text-sm text-foreground">{entry.relatedReview.comments}</p>}
              {entry.reasonText && <p className="mt-1 text-sm text-foreground">{entry.reasonText}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
