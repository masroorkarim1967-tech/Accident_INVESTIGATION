import type { ActionStatus } from "@/prisma/generated/prisma/client";

/**
 * FR-046, data-model.md §6.9.2 — `Overdue` is never a stored status; it is
 * recomputed on every read from `targetDate` and the current stored
 * status, so every view (investigation, dashboard, Action Tracker,
 * report) agrees without a scheduled job.
 */
const NEVER_OVERDUE_STATUSES: ActionStatus[] = ["Completed", "Verified", "Cancelled"];

function dateOnly(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Strictly before today — an action due exactly today is not yet Overdue. */
export function isOverdue(targetDate: Date, status: ActionStatus, now: Date = new Date()): boolean {
  if (NEVER_OVERDUE_STATUSES.includes(status)) return false;
  return dateOnly(targetDate) < dateOnly(now);
}

export type DisplayStatus = ActionStatus | "Overdue";

/** The status a UI should render: the stored status, or "Overdue" in its place. */
export function displayStatus(targetDate: Date, status: ActionStatus, now?: Date): DisplayStatus {
  return isOverdue(targetDate, status, now) ? "Overdue" : status;
}
