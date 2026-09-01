import type { ActionStatus } from "@/prisma/generated/prisma/client";
import { OverdueIndicator } from "./OverdueIndicator";

/**
 * ActionStatusBadge (ui-spec.md §4): one pill per stored status — Open=slate,
 * Assigned=blue, InProgress=amber, Completed=teal, Verified=green,
 * Cancelled=slate (struck-through label). Renders OverdueIndicator in its
 * place instead when `overdue` is true (FR-046) — Overdue is never a
 * stored status, so this component never receives it as `status` itself.
 */
const STATUS_COLOR_CLASSES: Record<ActionStatus, string> = {
  Open: "border-slate text-slate",
  Assigned: "border-blue text-blue",
  InProgress: "border-amber text-amber",
  Completed: "border-teal text-teal",
  Verified: "border-green text-green",
  Cancelled: "border-slate text-slate line-through",
};

export function ActionStatusBadge({ status, overdue }: { status: ActionStatus; overdue: boolean }) {
  if (overdue) {
    return <OverdueIndicator />;
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${STATUS_COLOR_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}
