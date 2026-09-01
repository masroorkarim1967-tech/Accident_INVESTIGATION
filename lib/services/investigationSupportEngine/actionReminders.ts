import { db } from "@/lib/db";
import { ActionStatus, InvestigationStatus } from "@/prisma/generated/prisma/client";
import { isOverdue } from "@/lib/services/overdueComputation";
import { SUPPORT_LABELS } from "./labels";

/**
 * assistance-engine.md §4.7 — Corrective-Action Reminders. Category A,
 * Definite. Proactive, time-based nudges — more specific than the Overdue
 * badge (FR-046) alone. Reuses lib/services/overdueComputation.ts's
 * isOverdue() as the single source of truth for what "Overdue" means, so
 * this never disagrees with the badge shown elsewhere. Completed,
 * Verified, and Cancelled actions never generate reminders, mirroring
 * FR-046's exclusion rule exactly (isOverdue already encodes this).
 */
const DUE_SOON_WINDOW_DAYS = 7;

export interface ActionReminder {
  message: string;
  href: string;
}

export interface ActionRemindersResult {
  label: string;
  reminders: ActionReminder[];
}

const NEVER_REMINDED_STATUSES: ActionStatus[] = ["Completed", "Verified", "Cancelled"];

interface ReminderableAction {
  id: number;
  description: string;
  targetDate: Date;
  status: ActionStatus;
  requiredForClosure: boolean;
  ownerUserId: number | null;
  ownerExternalName: string | null;
}

function href(investigationId: number): string {
  return `/investigations/${investigationId}/actions`;
}

export async function getActionReminders(investigationId: number, now: Date = new Date()): Promise<ActionRemindersResult> {
  const investigation = await db.investigation.findUnique({
    where: { id: investigationId },
    select: {
      status: true,
      correctiveActions: { select: { id: true, description: true, targetDate: true, status: true, requiredForClosure: true, ownerUserId: true, ownerExternalName: true } },
      preventiveActions: { select: { id: true, description: true, targetDate: true, status: true, requiredForClosure: true, ownerUserId: true, ownerExternalName: true } },
    },
  });

  const label = SUPPORT_LABELS.actionReminder;
  if (!investigation) return { label, reminders: [] };

  const allActions: ReminderableAction[] = [...investigation.correctiveActions, ...investigation.preventiveActions];
  const reminders: ActionReminder[] = [];
  const dueSoonThreshold = new Date(now.getTime() + DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  for (const action of allActions) {
    if (NEVER_REMINDED_STATUSES.includes(action.status)) continue;

    const overdue = isOverdue(action.targetDate, action.status, now);
    const shortDescription = action.description.slice(0, 60);

    if (overdue && action.requiredForClosure && investigation.status === InvestigationStatus.Review) {
      reminders.push({
        message: `Overdue and required for closure: "${shortDescription}" is blocking this investigation's approval.`,
        href: href(investigationId),
      });
    } else if (!overdue && action.targetDate <= dueSoonThreshold) {
      reminders.push({
        message: `"${shortDescription}" is due within ${DUE_SOON_WINDOW_DAYS} days.`,
        href: href(investigationId),
      });
    }

    // EC-14 (data-model.md, lib/validation/correctiveAction.ts) guarantees
    // exactly one of ownerUserId/ownerExternalName at save time — this
    // check is defensive and expected to never fire in practice.
    if (!action.ownerUserId && !action.ownerExternalName) {
      reminders.push({
        message: `"${shortDescription}" has no responsible person assigned.`,
        href: href(investigationId),
      });
    }
  }

  return { label, reminders };
}
