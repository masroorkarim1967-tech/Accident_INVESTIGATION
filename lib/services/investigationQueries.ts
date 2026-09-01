import { db } from "@/lib/db";
import { InvestigationStatus, UserRole, type Prisma } from "@/prisma/generated/prisma/client";

const PAGE_SIZE = 25;

export type InvestigationSortColumn = "referenceNumber" | "occurrenceDate" | "updatedAt";
export type SortDirection = "asc" | "desc";

export interface InvestigationListParams {
  currentUser: { id: number; role: UserRole };
  search?: string;
  status?: InvestigationStatus;
  dateFrom?: string;
  dateTo?: string;
  sortColumn?: InvestigationSortColumn;
  sortDirection?: SortDirection;
  page?: number;
}

export interface InvestigationListItem {
  id: number;
  referenceNumber: string;
  title: string;
  status: InvestigationStatus;
  occurrenceDateUtc: Date | null;
  createdByName: string;
  updatedAt: Date;
}

export interface InvestigationListResult {
  items: InvestigationListItem[];
  totalCount: number;
  page: number;
  pageCount: number;
}

/**
 * FR-007's role-scoped visibility rule, enforced as a query filter (never
 * a post-fetch UI filter, per security-spec.md §6's row-level-scoping
 * requirement — it must not leak the existence/count of other records).
 */
export function visibilityFilter(currentUser: { id: number; role: UserRole }): Prisma.InvestigationWhereInput {
  switch (currentUser.role) {
    case UserRole.Administrator:
    case UserRole.InvestigationManager:
    case UserRole.Reviewer:
      return {};
    case UserRole.Investigator:
      return {
        OR: [{ createdByUserId: currentUser.id }, { assignedInvestigatorUserId: currentUser.id }],
      };
    case UserRole.Viewer:
      return { status: { not: InvestigationStatus.Draft } };
  }
}

/**
 * FR-059 (search) + FR-060 (filter) + FR-061 (combine + sort) + FR-008
 * (pagination). Severity and Occurrence Category filters from FR-060 are
 * deliberately not implemented yet — both depend on `Occurrence` fields
 * Phase 5 adds; adding a control for a field that doesn't exist yet would
 * be a non-functional placeholder, not a real filter.
 */
export async function listInvestigations(params: InvestigationListParams): Promise<InvestigationListResult> {
  const where: Prisma.InvestigationWhereInput = {
    AND: [
      visibilityFilter(params.currentUser),
      params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: "insensitive" } },
              { referenceNumber: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {},
      params.status ? { status: params.status } : {},
      params.dateFrom || params.dateTo
        ? {
            occurrence: {
              occurrenceDateUtc: {
                ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
                ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
              },
            },
          }
        : {},
    ],
  };

  const totalCount = await db.investigation.count({ where });
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // FR-008: out-of-range page numbers clamp to the nearest valid page.
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  const orderBy = buildOrderBy(params.sortColumn, params.sortDirection);

  const rows = await db.investigation.findMany({
    where,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      createdBy: { select: { name: true } },
      occurrence: { select: { occurrenceDateUtc: true } },
    },
  });

  return {
    items: rows.map((row) => ({
      id: row.id,
      referenceNumber: row.referenceNumber,
      title: row.title,
      status: row.status,
      occurrenceDateUtc: row.occurrence?.occurrenceDateUtc ?? null,
      createdByName: row.createdBy.name,
      updatedAt: row.updatedAt,
    })),
    totalCount,
    page,
    pageCount,
  };
}

/**
 * FR-009's validation rule: the requesting user must have view access to
 * this investigation (FR-007's scoping) or the caller should show a
 * 404/redirect. Returns null rather than throwing — access denial and
 * genuine not-found are deliberately indistinguishable to the caller,
 * consistent with FR-007's row-level scoping not leaking existence.
 */
export async function getInvestigationDetail(id: number, currentUser: { id: number; role: UserRole }) {
  return db.investigation.findFirst({
    where: { AND: [{ id }, visibilityFilter(currentUser)] },
    include: {
      createdBy: { select: { name: true } },
      assignedInvestigator: { select: { id: true, name: true } },
      occurrence: {
        select: {
          occurrenceDateUtc: true,
          narrativeDescription: true,
          noWitnessesConfirmed: true,
          noEvidenceAvailableConfirmed: true,
        },
      },
      aircraft: { select: { investigationId: true } },
      flight: { select: { investigationId: true } },
      location: { select: { investigationId: true } },
      _count: { select: { witnesses: true, evidence: true, hazards: true } },
    },
  });
}

/** FR-006's picker: active users holding the Investigator role. */
export async function listActiveInvestigators() {
  return db.user.findMany({
    where: { role: UserRole.Investigator, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

function buildOrderBy(
  column: InvestigationSortColumn | undefined,
  direction: SortDirection | undefined,
): Prisma.InvestigationOrderByWithRelationInput {
  const dir = direction ?? "desc";
  switch (column) {
    case "referenceNumber":
      return { referenceNumber: dir };
    case "occurrenceDate":
      return { occurrence: { occurrenceDateUtc: dir } };
    case "updatedAt":
    default:
      return { updatedAt: dir };
  }
}
