import type { ActionPriority } from "@/prisma/generated/prisma/client";

/**
 * ActionPriorityBadge (ui-spec.md §4): Low=slate, Medium=blue, High=orange,
 * Critical=red — distinct from PriorityBadge (Investigation Priority,
 * data-model.md §6.5), a conceptually different scale on a different entity.
 */
const PRIORITY_COLOR_CLASSES: Record<ActionPriority, string> = {
  Low: "border-slate text-slate",
  Medium: "border-blue text-blue",
  High: "border-orange text-orange",
  Critical: "border-red text-red",
};

export function ActionPriorityBadge({ priority }: { priority: ActionPriority }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${PRIORITY_COLOR_CLASSES[priority]}`}>
      {priority}
    </span>
  );
}
