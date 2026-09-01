const FINDING_TYPE_LABELS: Record<string, string> = {
  Cause: "Cause",
  ContributingFactor: "Contributing Factor",
  RiskObservation: "Risk Observation",
  Other: "Other",
};

export interface FindingCardData {
  id: number;
  findingNumber: number;
  findingType: string;
  description: string;
  citedHazards: string[];
  citedContributingFactors: string[];
  citedRootCauses: string[];
}

/** ui-spec.md §10 — each Finding renders as a card headed by its number and type, cited items as chips. */
export function FindingCard({
  finding,
  readOnly,
  onEdit,
  onRemove,
}: {
  finding: FindingCardData;
  readOnly: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const chips = [...finding.citedHazards, ...finding.citedContributingFactors, ...finding.citedRootCauses];

  return (
    <li className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">
            Finding {finding.findingNumber} · {FINDING_TYPE_LABELS[finding.findingType] ?? finding.findingType}
          </p>
          <p className="mt-1 text-sm text-foreground">{finding.description}</p>
        </div>
        {!readOnly && (
          <div className="flex flex-shrink-0 gap-2">
            <button type="button" onClick={onEdit} className="text-xs text-teal hover:underline">Edit</button>
            <button type="button" onClick={onRemove} className="text-xs text-red hover:underline">Remove</button>
          </div>
        )}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip, i) => (
            <span key={i} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
              {chip}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
