import type { InvestigationStatus } from "@/prisma/generated/prisma/client";

/**
 * StageBadge (ui-spec.md §4): pill with a small colored "lamp" dot + label.
 * Colors per ui-spec.md §1.2: Draft=slate, Open=blue,
 * Under Investigation=teal, Analysis=amber, Review=violet, Closed=green.
 */
const STAGE_LABELS: Record<InvestigationStatus, string> = {
  Draft: "Draft",
  Open: "Open",
  UnderInvestigation: "Under Investigation",
  Analysis: "Analysis",
  Review: "Review",
  Closed: "Closed",
};

const STAGE_COLOR_CLASSES: Record<InvestigationStatus, string> = {
  Draft: "border-slate text-slate",
  Open: "border-blue text-blue",
  UnderInvestigation: "border-teal text-teal",
  Analysis: "border-amber text-amber",
  Review: "border-violet text-violet",
  Closed: "border-green text-green",
};

export function StageBadge({ status }: { status: InvestigationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${STAGE_COLOR_CLASSES[status]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {STAGE_LABELS[status]}
    </span>
  );
}
