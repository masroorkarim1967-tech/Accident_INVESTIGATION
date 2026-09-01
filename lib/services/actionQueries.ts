import { db } from "@/lib/db";
import { visibilityFilter } from "@/lib/services/investigationQueries";
import { isOverdue } from "@/lib/services/overdueComputation";
import { ActionPriority, ActionStatus, UserRole, type Prisma } from "@/prisma/generated/prisma/client";

export interface ActionTrackerFilters {
  currentUser: { id: number; role: UserRole };
  ownerUserIds?: number[];
  ownerExternalNames?: string[];
  statuses?: ActionStatus[];
  includeOverdue?: boolean;
  priorities?: ActionPriority[];
  targetDateFrom?: string;
  targetDateTo?: string;
  investigationIds?: number[];
}

export interface ActionTrackerRow {
  id: number;
  kind: "Corrective" | "Preventive";
  description: string;
  investigationId: number;
  investigationReference: string;
  investigationTitle: string;
  ownerUserId: number | null;
  ownerExternalName: string | null;
  ownerName: string | null;
  department: string | null;
  priority: ActionPriority;
  targetDate: Date;
  status: ActionStatus;
  overdue: boolean;
  requiredForClosure: boolean;
}

export interface OwnerOption {
  key: string;
  label: string;
}

export interface InvestigationOption {
  id: number;
  label: string;
}

/**
 * FR-070 — Portfolio-Wide Action Tracker. Role-scoped visibility (FR-007,
 * via the same `visibilityFilter` the Investigations list uses) applied
 * through each action's parent investigation. `Overdue` isn't a stored
 * column, so it can't be pushed into the Prisma `where` — every
 * date/priority/investigation-scoped filter runs at the DB level, and
 * Status (incl. Overdue) is applied afterward in application code, which
 * is fine at this app's documented portfolio scale (tens to low hundreds
 * of actions, assistance-engine.md §3.4).
 */
export async function listPortfolioActions(filters: ActionTrackerFilters): Promise<ActionTrackerRow[]> {
  const investigationWhere = visibilityFilter(filters.currentUser);

  const where: Prisma.CorrectiveActionWhereInput = {
    investigation: investigationWhere,
    ...(filters.priorities && filters.priorities.length > 0 ? { priority: { in: filters.priorities } } : {}),
    ...(filters.investigationIds && filters.investigationIds.length > 0 ? { investigationId: { in: filters.investigationIds } } : {}),
    ...(filters.targetDateFrom || filters.targetDateTo
      ? {
          targetDate: {
            ...(filters.targetDateFrom ? { gte: new Date(filters.targetDateFrom) } : {}),
            ...(filters.targetDateTo ? { lte: new Date(filters.targetDateTo) } : {}),
          },
        }
      : {}),
    ...(filters.ownerUserIds && filters.ownerUserIds.length > 0
      ? { OR: [{ ownerUserId: { in: filters.ownerUserIds } }, { ownerExternalName: { in: filters.ownerExternalNames ?? [] } }] }
      : filters.ownerExternalNames && filters.ownerExternalNames.length > 0
        ? { ownerExternalName: { in: filters.ownerExternalNames } }
        : {}),
  };

  const include = {
    investigation: { select: { id: true, referenceNumber: true, title: true } },
    owner: { select: { name: true } },
  } as const;

  const [correctiveRows, preventiveRows] = await Promise.all([
    db.correctiveAction.findMany({ where, include, orderBy: { targetDate: "asc" } }),
    db.preventiveAction.findMany({ where: where as Prisma.PreventiveActionWhereInput, include, orderBy: { targetDate: "asc" } }),
  ]);

  const rows: ActionTrackerRow[] = [
    ...correctiveRows.map((row) => ({
      id: row.id,
      kind: "Corrective" as const,
      description: row.description,
      investigationId: row.investigation.id,
      investigationReference: row.investigation.referenceNumber,
      investigationTitle: row.investigation.title,
      ownerUserId: row.ownerUserId,
      ownerExternalName: row.ownerExternalName,
      ownerName: row.owner?.name ?? null,
      department: row.department,
      priority: row.priority,
      targetDate: row.targetDate,
      status: row.status,
      overdue: isOverdue(row.targetDate, row.status),
      requiredForClosure: row.requiredForClosure,
    })),
    ...preventiveRows.map((row) => ({
      id: row.id,
      kind: "Preventive" as const,
      description: row.description,
      investigationId: row.investigation.id,
      investigationReference: row.investigation.referenceNumber,
      investigationTitle: row.investigation.title,
      ownerUserId: row.ownerUserId,
      ownerExternalName: row.ownerExternalName,
      ownerName: row.owner?.name ?? null,
      department: row.department,
      priority: row.priority,
      targetDate: row.targetDate,
      status: row.status,
      overdue: isOverdue(row.targetDate, row.status),
      requiredForClosure: row.requiredForClosure,
    })),
  ];

  const statuses = filters.statuses ?? [];
  const statusFilterActive = statuses.length > 0 || filters.includeOverdue === true;
  if (!statusFilterActive) {
    return rows;
  }

  return rows.filter((row) => (row.overdue ? Boolean(filters.includeOverdue) : statuses.includes(row.status)));
}

/** Dynamic Owner filter options, drawn only from actions currently visible to the requesting role (FR-070). */
export async function listActionOwnerOptions(currentUser: { id: number; role: UserRole }): Promise<OwnerOption[]> {
  const investigationWhere = visibilityFilter(currentUser);
  const [correctiveOwners, preventiveOwners] = await Promise.all([
    db.correctiveAction.findMany({
      where: { investigation: investigationWhere },
      select: { ownerUserId: true, ownerExternalName: true, owner: { select: { name: true } } },
      distinct: ["ownerUserId", "ownerExternalName"],
    }),
    db.preventiveAction.findMany({
      where: { investigation: investigationWhere },
      select: { ownerUserId: true, ownerExternalName: true, owner: { select: { name: true } } },
      distinct: ["ownerUserId", "ownerExternalName"],
    }),
  ]);

  const options = new Map<string, OwnerOption>();
  for (const row of [...correctiveOwners, ...preventiveOwners]) {
    if (row.ownerUserId) {
      options.set(`user:${row.ownerUserId}`, { key: `user:${row.ownerUserId}`, label: row.owner?.name ?? `User #${row.ownerUserId}` });
    } else if (row.ownerExternalName) {
      options.set(`external:${row.ownerExternalName}`, { key: `external:${row.ownerExternalName}`, label: row.ownerExternalName });
    }
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Dynamic Investigation filter options, scoped to the same role-visible set (FR-070). */
export async function listActionInvestigationOptions(currentUser: { id: number; role: UserRole }): Promise<InvestigationOption[]> {
  const investigations = await db.investigation.findMany({
    where: {
      ...visibilityFilter(currentUser),
      OR: [{ correctiveActions: { some: {} } }, { preventiveActions: { some: {} } }],
    },
    select: { id: true, referenceNumber: true, title: true },
    orderBy: { referenceNumber: "asc" },
  });
  return investigations.map((inv) => ({ id: inv.id, label: `${inv.referenceNumber} — ${inv.title}` }));
}
