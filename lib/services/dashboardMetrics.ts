import type { ActionStatus, FactorCategory, InvestigationStatus, OccurrenceCategory } from "@/prisma/generated/prisma/client";
import { isOverdue } from "@/lib/services/overdueComputation";

/**
 * functional-requirements.md §1.0 — Dashboard metric definitions. Every
 * function here is pure (no DB access, no Date.now() unless passed in) so
 * it can be unit-tested directly against §1.1's worked example, independent
 * of the Prisma query layer (lib/services/dashboardQueries.ts) that feeds
 * it real rows. One function per tile/chart (technical-architecture.md
 * §5's "pure query-and-aggregate function" pattern).
 */

const OCCURRENCE_CATEGORIES: OccurrenceCategory[] = [
  "AircraftIncident", "GroundHandlingIncident", "RampSafetyIncident", "BaggageIncident",
  "CargoIncident", "DangerousGoodsIncident", "PassengerHandlingIncident", "SecurityRelatedOccurrence",
  "OccupationalSafetyIncident", "EquipmentVehicleIncident", "MaintenanceRelatedOccurrence",
  "EnvironmentalOccurrence", "NearMiss", "Other",
];

const FACTOR_CATEGORIES: FactorCategory[] = [
  "HumanFactors", "Equipment", "Environment", "Procedures", "Training",
  "Supervision", "Communication", "Organization", "Management", "ExternalFactors",
];

const INVESTIGATION_STATUSES: InvestigationStatus[] = ["Draft", "Open", "UnderInvestigation", "Analysis", "Review", "Closed"];

const NEVER_OVERDUE_ACTION_STATUSES: ActionStatus[] = ["Completed", "Verified", "Cancelled"];

export interface DashboardInvestigationRow {
  id: number;
  status: InvestigationStatus;
  occurrenceCategory: OccurrenceCategory | null;
  aerodromeCode: string | null;
  occurrenceDateUtc: Date | null;
}

export interface StatTiles {
  total: number;
  open: number;
  underInvestigation: number;
  awaitingReview: number;
  closed: number;
}

/** §1.0.2 — the 4 status-bucket tiles + Total. Invariant: the 4 sum to Total. */
export function computeStatTiles(rows: DashboardInvestigationRow[]): StatTiles {
  let open = 0;
  let underInvestigation = 0;
  let awaitingReview = 0;
  let closed = 0;
  for (const row of rows) {
    if (row.status === "Draft" || row.status === "Open") open += 1;
    else if (row.status === "UnderInvestigation" || row.status === "Analysis") underInvestigation += 1;
    else if (row.status === "Review") awaitingReview += 1;
    else if (row.status === "Closed") closed += 1;
  }
  return { total: rows.length, open, underInvestigation, awaitingReview, closed };
}

export interface StatusChartEntry {
  status: InvestigationStatus;
  count: number;
}

/** §1.0.3 — Investigations by Status: all 6 statuses shown, including zero-count. */
export function computeStatusChart(rows: DashboardInvestigationRow[]): StatusChartEntry[] {
  const counts = new Map<InvestigationStatus, number>(INVESTIGATION_STATUSES.map((s) => [s, 0]));
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return INVESTIGATION_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

export interface CategoryChartEntry {
  category: OccurrenceCategory | "Unclassified";
  count: number;
}

/** §1.0.3 — Investigations by Occurrence Category: all 14 + Unclassified, including zero-count. */
export function computeCategoryChart(rows: DashboardInvestigationRow[]): CategoryChartEntry[] {
  const counts = new Map<OccurrenceCategory | "Unclassified", number>(
    OCCURRENCE_CATEGORIES.map((c) => [c, 0]),
  );
  counts.set("Unclassified", 0);
  for (const row of rows) {
    const key = row.occurrenceCategory ?? "Unclassified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...OCCURRENCE_CATEGORIES, "Unclassified" as const].map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
}

export interface LocationChartEntry {
  label: string;
  count: number;
}

const MAX_LOCATION_BARS = 10;

/** §1.0.3 — Incidents by Location: top 10 aerodromes descending + "Other" for the remainder. */
export function computeLocationChart(rows: DashboardInvestigationRow[]): LocationChartEntry[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.aerodromeCode ?? "Unspecified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, MAX_LOCATION_BARS);
  const rest = sorted.slice(MAX_LOCATION_BARS);
  const otherCount = rest.reduce((sum, [, count]) => sum + count, 0);
  const result: LocationChartEntry[] = top.map(([label, count]) => ({ label, count }));
  if (otherCount > 0) result.push({ label: "Other", count: otherCount });
  return result;
}

export interface FactorChartEntry {
  category: FactorCategory;
  count: number;
}

/** §1.0.3 — Contributing-Factor Distribution: all 10 categories, including zero-count. */
export function computeContributingFactorChart(factorCategories: FactorCategory[]): FactorChartEntry[] {
  const counts = new Map<FactorCategory, number>(FACTOR_CATEGORIES.map((c) => [c, 0]));
  for (const category of factorCategories) counts.set(category, (counts.get(category) ?? 0) + 1);
  return FACTOR_CATEGORIES.map((category) => ({ category, count: counts.get(category) ?? 0 }));
}

export type ActionStatusBucket = "Completed" | "Verified" | "Cancelled" | "Overdue" | "Open" | "Assigned" | "InProgress";
const ACTION_STATUS_BUCKETS: ActionStatusBucket[] = ["Completed", "Verified", "Cancelled", "Overdue", "Open", "Assigned", "InProgress"];

export interface ActionStatusChartEntry {
  bucket: ActionStatusBucket;
  count: number;
}

export interface DashboardActionRow {
  status: ActionStatus;
  targetDate: Date;
}

/**
 * §1.0.3 — Corrective-Action Status: 7 segments. A stored Open/Assigned/
 * InProgress row past its target date counts only as Overdue, mirroring
 * FR-046's display rule (never double-counted).
 */
export function computeActionStatusChart(actions: DashboardActionRow[], now: Date = new Date()): ActionStatusChartEntry[] {
  const counts = new Map<ActionStatusBucket, number>(ACTION_STATUS_BUCKETS.map((b) => [b, 0]));
  for (const action of actions) {
    const bucket: ActionStatusBucket = isOverdue(action.targetDate, action.status, now) ? "Overdue" : (action.status as ActionStatusBucket);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return ACTION_STATUS_BUCKETS.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 }));
}

/** §1.0.2 — Overdue Corrective Actions tile. Scoped to CorrectiveAction only, per §1.0.2's note. */
export function computeOverdueCorrectiveActionsCount(actions: DashboardActionRow[], now: Date = new Date()): number {
  return actions.filter((a) => isOverdue(a.targetDate, a.status, now)).length;
}

export interface DashboardHazardRow {
  initialRiskBand: string;
  residualRiskBand: string | null;
  investigationStatus: InvestigationStatus;
}

const HIGH_RISK_BANDS = new Set(["High", "Critical"]);

/**
 * §1.0.2 — High-Risk Findings tile. Uses residual risk (falls back to
 * initial when no residual assessment recorded), scoped to non-Closed
 * investigations.
 */
export function computeHighRiskFindingsCount(hazards: DashboardHazardRow[]): number {
  return hazards.filter((h) => {
    if (h.investigationStatus === "Closed") return false;
    const band = h.residualRiskBand ?? h.initialRiskBand;
    return HIGH_RISK_BANDS.has(band);
  }).length;
}

export interface TrendChartEntry {
  month: string; // "YYYY-MM"
  count: number;
}

/**
 * §1.0.3 — Monthly Investigation Trend, zero-filled. Default window:
 * trailing 12 months ending the current month; a wider explicit range
 * (from a Date Range filter) is used verbatim, capped at 24 months.
 */
export function computeMonthlyTrend(
  rows: DashboardInvestigationRow[],
  range: { from: Date; to: Date },
): TrendChartEntry[] {
  const months: string[] = [];
  const cursor = new Date(Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), 1));
  while (cursor <= end && months.length < 24) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const counts = new Map<string, number>(months.map((m) => [m, 0]));
  for (const row of rows) {
    if (!row.occurrenceDateUtc) continue;
    const key = `${row.occurrenceDateUtc.getUTCFullYear()}-${String(row.occurrenceDateUtc.getUTCMonth() + 1).padStart(2, "0")}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return months.map((month) => ({ month, count: counts.get(month) ?? 0 }));
}

/** Default trailing-12-months window ending the current month (§1.0.3). */
export function defaultTrendRange(now: Date = new Date()): { from: Date; to: Date } {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
  return { from, to };
}
