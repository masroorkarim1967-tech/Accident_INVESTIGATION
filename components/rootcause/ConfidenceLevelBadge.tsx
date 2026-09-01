import type { ConfidenceLevel } from "@/prisma/generated/prisma/client";

/**
 * ConfidenceLevelBadge (FR-038) — the investigator's stated confidence in
 * a Potential Root Cause: Low=slate, Medium=amber, High=teal. Distinct
 * from RiskBadge/PriorityBadge, which are system-computed scales; this
 * one is always investigator-asserted, never computed.
 */
const CONFIDENCE_COLOR_CLASSES: Record<ConfidenceLevel, string> = {
  Low: "border-slate text-slate",
  Medium: "border-amber text-amber",
  High: "border-teal text-teal",
};

export function ConfidenceLevelBadge({ confidenceLevel }: { confidenceLevel: ConfidenceLevel | null }) {
  if (confidenceLevel === null) {
    return <span className="text-sm text-muted">Not stated</span>;
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${CONFIDENCE_COLOR_CLASSES[confidenceLevel]}`}
    >
      {confidenceLevel} Confidence
    </span>
  );
}
