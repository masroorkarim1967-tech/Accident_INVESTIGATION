import { db } from "@/lib/db";
import type { InvestigationStatus, OccurrenceCategory, RiskSeverity, Prisma } from "@/prisma/generated/prisma/client";
import {
  computeStatTiles,
  computeStatusChart,
  computeCategoryChart,
  computeLocationChart,
  computeContributingFactorChart,
  computeActionStatusChart,
  computeOverdueCorrectiveActionsCount,
  computeHighRiskFindingsCount,
  computeMonthlyTrend,
  defaultTrendRange,
  type DashboardInvestigationRow,
  type StatTiles,
  type StatusChartEntry,
  type CategoryChartEntry,
  type LocationChartEntry,
  type FactorChartEntry,
  type ActionStatusChartEntry,
  type TrendChartEntry,
} from "@/lib/services/dashboardMetrics";

/**
 * functional-requirements.md §1.0.1 — the FilteredInvestigationsSet, built
 * with Prisma's default relation-filter semantics: a relation filter is
 * only added when that dimension is actually active, so an investigation
 * missing that relation (e.g. no Aircraft yet) stays included whenever
 * nothing filters on it — the same LEFT JOIN-when-unfiltered behavior the
 * spec's raw SQL describes.
 */
export interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: InvestigationStatus[];
  category?: OccurrenceCategory[];
  aerodrome?: string[];
  aircraft?: string[];
  severity?: RiskSeverity[];
}

const MAX_TREND_MONTHS = 24;
const RECENT_INVESTIGATIONS_LIMIT = 8;

function buildWhere(filters: DashboardFilters): Prisma.InvestigationWhereInput {
  const where: Prisma.InvestigationWhereInput = {};

  const occurrenceConditions: Prisma.OccurrenceWhereInput = {};
  if (filters.dateFrom || filters.dateTo) {
    occurrenceConditions.occurrenceDateUtc = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }
  if (filters.category?.length) occurrenceConditions.occurrenceCategory = { in: filters.category };
  if (filters.severity?.length) occurrenceConditions.severity = { in: filters.severity };
  if (Object.keys(occurrenceConditions).length > 0) where.occurrence = occurrenceConditions;

  if (filters.status?.length) where.status = { in: filters.status };
  if (filters.aerodrome?.length) where.location = { aerodromeCode: { in: filters.aerodrome } };
  if (filters.aircraft?.length) where.aircraft = { model: { in: filters.aircraft } };

  return where;
}

export interface RecentInvestigationRow {
  id: number;
  referenceNumber: string;
  title: string;
  status: InvestigationStatus;
  severity: RiskSeverity | null;
  occurrenceDateUtc: Date | null;
}

export interface DashboardData {
  tiles: StatTiles & { overdueCorrectiveActions: number; highRiskFindings: number };
  statusChart: StatusChartEntry[];
  categoryChart: CategoryChartEntry[];
  locationChart: LocationChartEntry[];
  contributingFactorChart: FactorChartEntry[];
  actionStatusChart: ActionStatusChartEntry[];
  trendChart: TrendChartEntry[];
  trendTruncated: boolean;
  recentInvestigations: RecentInvestigationRow[];
  filterOptions: {
    aerodromes: string[];
    aircraftModels: string[];
  };
}

export async function getDashboardData(filters: DashboardFilters, now: Date = new Date()): Promise<DashboardData> {
  const where = buildWhere(filters);

  const investigations = await db.investigation.findMany({
    where,
    select: {
      id: true,
      status: true,
      occurrence: { select: { occurrenceCategory: true, occurrenceDateUtc: true } },
      location: { select: { aerodromeCode: true } },
    },
  });

  const rows: DashboardInvestigationRow[] = investigations.map((inv) => ({
    id: inv.id,
    status: inv.status,
    occurrenceCategory: inv.occurrence?.occurrenceCategory ?? null,
    aerodromeCode: inv.location?.aerodromeCode ?? null,
    occurrenceDateUtc: inv.occurrence?.occurrenceDateUtc ?? null,
  }));
  const statusById = new Map(rows.map((r) => [r.id, r.status]));
  const investigationIds = rows.map((r) => r.id);

  const [correctiveActions, hazards, contributingFactors, recentInvestigations, aerodromeRows, aircraftRows] = await Promise.all([
    db.correctiveAction.findMany({
      where: { investigationId: { in: investigationIds } },
      select: { status: true, targetDate: true },
    }),
    db.hazard.findMany({
      where: { investigationId: { in: investigationIds } },
      select: { investigationId: true, initialRiskBand: true, residualRiskBand: true },
    }),
    db.contributingFactor.findMany({
      where: { investigationId: { in: investigationIds } },
      select: { category: true },
    }),
    db.investigation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: RECENT_INVESTIGATIONS_LIMIT,
      select: {
        id: true,
        referenceNumber: true,
        title: true,
        status: true,
        occurrence: { select: { severity: true, occurrenceDateUtc: true } },
      },
    }),
    db.location.findMany({ where: { aerodromeCode: { not: null } }, select: { aerodromeCode: true }, distinct: ["aerodromeCode"] }),
    db.aircraft.findMany({ select: { model: true }, distinct: ["model"] }),
  ]);

  const { from: defaultFrom, to: defaultTo } = defaultTrendRange(now);
  let trendFrom = defaultFrom;
  let trendTo = defaultTo;
  let trendTruncated = false;
  if (filters.dateFrom || filters.dateTo) {
    trendFrom = filters.dateFrom ?? defaultFrom;
    trendTo = filters.dateTo ?? now;
    const monthSpan =
      (trendTo.getUTCFullYear() - trendFrom.getUTCFullYear()) * 12 + (trendTo.getUTCMonth() - trendFrom.getUTCMonth()) + 1;
    if (monthSpan > MAX_TREND_MONTHS) {
      trendTruncated = true;
      trendTo = new Date(Date.UTC(trendFrom.getUTCFullYear(), trendFrom.getUTCMonth() + MAX_TREND_MONTHS - 1, 1));
    }
  }

  return {
    tiles: {
      ...computeStatTiles(rows),
      overdueCorrectiveActions: computeOverdueCorrectiveActionsCount(correctiveActions, now),
      highRiskFindings: computeHighRiskFindingsCount(
        hazards.map((h) => ({
          initialRiskBand: h.initialRiskBand,
          residualRiskBand: h.residualRiskBand,
          investigationStatus: statusById.get(h.investigationId)!,
        })),
      ),
    },
    statusChart: computeStatusChart(rows),
    categoryChart: computeCategoryChart(rows),
    locationChart: computeLocationChart(rows),
    contributingFactorChart: computeContributingFactorChart(contributingFactors.map((f) => f.category)),
    actionStatusChart: computeActionStatusChart(correctiveActions, now),
    trendChart: computeMonthlyTrend(rows, { from: trendFrom, to: trendTo }),
    trendTruncated,
    recentInvestigations: recentInvestigations.map((inv) => ({
      id: inv.id,
      referenceNumber: inv.referenceNumber,
      title: inv.title,
      status: inv.status,
      severity: inv.occurrence?.severity ?? null,
      occurrenceDateUtc: inv.occurrence?.occurrenceDateUtc ?? null,
    })),
    filterOptions: {
      aerodromes: aerodromeRows.map((r) => r.aerodromeCode!).sort(),
      aircraftModels: aircraftRows.map((r) => r.model).sort(),
    },
  };
}
