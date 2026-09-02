import type { RiskSeverity } from "@/prisma/generated/prisma/client";

/**
 * SeverityBadge (ui-spec.md §4): the shared outcome scale
 * (data-model.md §6.6) — Negligible=slate, Minor=blue, Moderate=amber,
 * Major=orange, Catastrophic=red.
 */
const SEVERITY_COLOR_CLASSES: Record<RiskSeverity, string> = {
  Negligible: "border-slate text-slate",
  Minor: "border-blue text-blue",
  Moderate: "border-amber text-amber",
  Major: "border-orange text-orange",
  Catastrophic: "border-red text-red",
};

export function SeverityBadge({ severity }: { severity: RiskSeverity | null }) {
  if (severity === null) {
    return <span className="text-sm text-muted">Not yet determined</span>;
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${SEVERITY_COLOR_CLASSES[severity]}`}>
      {severity}
    </span>
  );
}
