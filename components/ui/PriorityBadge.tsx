import type { InvestigationPriority } from "@/prisma/generated/prisma/client";

/**
 * PriorityBadge (ui-spec.md §4): Routine=slate, Elevated=amber, Urgent=orange,
 * Immediate=red — the Investigation Priority scale, distinct from Action
 * Priority (ActionPriorityBadge, added when Phase 9 needs it).
 */
const PRIORITY_COLOR_CLASSES: Record<InvestigationPriority, string> = {
  Routine: "border-slate text-slate",
  Elevated: "border-amber text-amber",
  Urgent: "border-orange text-orange",
  Immediate: "border-red text-red",
};

export function PriorityBadge({ priority }: { priority: InvestigationPriority | null }) {
  if (priority === null) {
    return <span className="text-sm text-muted">Not yet determined</span>;
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${PRIORITY_COLOR_CLASSES[priority]}`}>
      {priority}
    </span>
  );
}
