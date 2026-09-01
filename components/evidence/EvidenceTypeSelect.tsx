const EVIDENCE_TYPES = [
  "Photographs",
  "Documents",
  "Statements",
  "CCTVReference",
  "FlightRecords",
  "MaintenanceRecords",
  "GroundHandlingRecords",
  "TrainingRecords",
  "Emails",
  "Other",
];

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  Photographs: "Photographs",
  Documents: "Documents",
  Statements: "Statements",
  CCTVReference: "CCTV Reference",
  FlightRecords: "Flight Records",
  MaintenanceRecords: "Maintenance Records",
  GroundHandlingRecords: "Ground Handling Records",
  TrainingRecords: "Training Records",
  Emails: "Emails",
  Other: "Other",
};

/** The 10-category Evidence taxonomy (data-model.md §6.10, FR-021). */
export function EvidenceTypeSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      id="evidenceType"
      name="evidenceType"
      required
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
    >
      <option value="" disabled>
        Select evidence type
      </option>
      {EVIDENCE_TYPES.map((t) => (
        <option key={t} value={t}>
          {EVIDENCE_TYPE_LABELS[t]}
        </option>
      ))}
    </select>
  );
}
