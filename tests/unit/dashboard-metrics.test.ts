import { describe, expect, it } from "vitest";
import type { FactorCategory } from "@/prisma/generated/prisma/client";
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
  type DashboardInvestigationRow,
  type DashboardActionRow,
  type DashboardHazardRow,
} from "@/lib/services/dashboardMetrics";

/**
 * functional-requirements.md §1.1's worked example (corrected onto the
 * real OccurrenceCategory/RiskSeverity enums during Phase 12 — see the
 * §1.1 revision note). "Today" for Overdue calculations is 2026-09-01.
 */
const ROWS: DashboardInvestigationRow[] = [
  { id: 1, status: "Closed", occurrenceCategory: "AircraftIncident", aerodromeCode: "ZZFI", occurrenceDateUtc: new Date("2025-10-15") },
  { id: 2, status: "Closed", occurrenceCategory: "AircraftIncident", aerodromeCode: "ZZFC", occurrenceDateUtc: new Date("2025-11-15") },
  { id: 3, status: "Closed", occurrenceCategory: "GroundHandlingIncident", aerodromeCode: "ZZFI", occurrenceDateUtc: new Date("2025-11-20") },
  { id: 4, status: "Review", occurrenceCategory: "MaintenanceRelatedOccurrence", aerodromeCode: "ZZFM", occurrenceDateUtc: new Date("2025-12-15") },
  { id: 5, status: "Review", occurrenceCategory: "AircraftIncident", aerodromeCode: "ZZFC", occurrenceDateUtc: new Date("2026-01-15") },
  { id: 6, status: "Analysis", occurrenceCategory: "AircraftIncident", aerodromeCode: "ZZFI", occurrenceDateUtc: new Date("2026-02-15") },
  { id: 8, status: "UnderInvestigation", occurrenceCategory: "GroundHandlingIncident", aerodromeCode: "ZZFM", occurrenceDateUtc: new Date("2026-03-15") },
  { id: 9, status: "UnderInvestigation", occurrenceCategory: "SecurityRelatedOccurrence", aerodromeCode: "ZZFI", occurrenceDateUtc: new Date("2026-04-15") },
  { id: 10, status: "Open", occurrenceCategory: "MaintenanceRelatedOccurrence", aerodromeCode: "ZZFC", occurrenceDateUtc: new Date("2026-05-15") },
  { id: 11, status: "Open", occurrenceCategory: "Other", aerodromeCode: "ZZFI", occurrenceDateUtc: new Date("2026-05-20") },
  { id: 12, status: "Draft", occurrenceCategory: null, aerodromeCode: null, occurrenceDateUtc: new Date("2026-06-15") },
  { id: 13, status: "Closed", occurrenceCategory: "AircraftIncident", aerodromeCode: "ZZFC", occurrenceDateUtc: new Date("2025-09-15") },
  { id: 14, status: "Closed", occurrenceCategory: "AircraftIncident", aerodromeCode: "ZZFI", occurrenceDateUtc: new Date("2025-12-20") },
  { id: 31, status: "Analysis", occurrenceCategory: "AircraftIncident", aerodromeCode: "ZZFC", occurrenceDateUtc: new Date("2026-06-25") },
];

const TODAY = new Date("2026-09-01T00:00:00Z");

describe("Dashboard metrics (functional-requirements.md §1.1 worked example)", () => {
  it("computes the 4 status-bucket tiles summing to Total = 14", () => {
    const tiles = computeStatTiles(ROWS);
    expect(tiles).toEqual({ total: 14, open: 3, underInvestigation: 4, awaitingReview: 2, closed: 5 });
    expect(tiles.open + tiles.underInvestigation + tiles.awaitingReview + tiles.closed).toBe(tiles.total);
  });

  it("computes Investigations by Status across all 6 statuses, including zero-count", () => {
    const chart = computeStatusChart(ROWS);
    expect(chart).toEqual([
      { status: "Draft", count: 1 },
      { status: "Open", count: 2 },
      { status: "UnderInvestigation", count: 2 },
      { status: "Analysis", count: 2 },
      { status: "Review", count: 2 },
      { status: "Closed", count: 5 },
    ]);
  });

  it("computes Investigations by Occurrence Category, remapped onto the real enum, with Unclassified", () => {
    const chart = computeCategoryChart(ROWS);
    const byCategory = Object.fromEntries(chart.map((c) => [c.category, c.count]));
    expect(byCategory.AircraftIncident).toBe(7);
    expect(byCategory.GroundHandlingIncident).toBe(2);
    expect(byCategory.MaintenanceRelatedOccurrence).toBe(2);
    expect(byCategory.SecurityRelatedOccurrence).toBe(1);
    expect(byCategory.Other).toBe(1);
    expect(byCategory.Unclassified).toBe(1);
    expect(byCategory.RampSafetyIncident).toBe(0);
    expect(chart.reduce((sum, c) => sum + c.count, 0)).toBe(14);
  });

  it("computes Incidents by Location with no Other bucket under 10 distinct locations", () => {
    const chart = computeLocationChart(ROWS);
    expect(chart).toEqual([
      { label: "ZZFI", count: 6 },
      { label: "ZZFC", count: 5 },
      { label: "ZZFM", count: 2 },
      { label: "Unspecified", count: 1 },
    ]);
  });

  it("computes the Monthly Investigation Trend for the trailing-12-months-ending-today window", () => {
    const trend = computeMonthlyTrend(ROWS, { from: new Date("2025-10-01"), to: new Date("2026-09-01") });
    expect(trend).toEqual([
      { month: "2025-10", count: 1 },
      { month: "2025-11", count: 2 },
      { month: "2025-12", count: 2 },
      { month: "2026-01", count: 1 },
      { month: "2026-02", count: 1 },
      { month: "2026-03", count: 1 },
      { month: "2026-04", count: 1 },
      { month: "2026-05", count: 2 },
      { month: "2026-06", count: 2 },
      { month: "2026-07", count: 0 },
      { month: "2026-08", count: 0 },
      { month: "2026-09", count: 0 },
    ]);
    expect(trend.reduce((sum, m) => sum + m.count, 0)).toBe(13); // INC-2026-0013's 2025-09 date falls outside the window
  });

  it("computes High-Risk Findings = 4, using residual (falling back to initial), excluding Closed", () => {
    const hazards: DashboardHazardRow[] = [
      { initialRiskBand: "Critical", residualRiskBand: null, investigationStatus: "Review" }, // 0005 #1
      { initialRiskBand: "High", residualRiskBand: null, investigationStatus: "Review" }, // 0005 #2
      { initialRiskBand: "High", residualRiskBand: null, investigationStatus: "Analysis" }, // 0006
      { initialRiskBand: "High", residualRiskBand: null, investigationStatus: "Analysis" }, // 0031
      { initialRiskBand: "Moderate", residualRiskBand: null, investigationStatus: "Closed" }, // 0001, excluded
    ];
    expect(computeHighRiskFindingsCount(hazards)).toBe(4);
  });

  it("computes the Corrective-Action Status chart (7 buckets, sum=8) and Overdue tile = 3", () => {
    const actions: DashboardActionRow[] = [
      { status: "Verified", targetDate: new Date("2025-11-01") }, // 0001
      { status: "Completed", targetDate: new Date("2025-12-01") }, // 0002
      { status: "Open", targetDate: new Date("2026-08-15") }, // 0004 -> Overdue
      { status: "InProgress", targetDate: new Date("2026-07-01") }, // 0005 -> Overdue
      { status: "Assigned", targetDate: new Date("2026-09-15") }, // 0006
      { status: "Cancelled", targetDate: new Date("2026-06-01") }, // 0008, never overdue
      { status: "Open", targetDate: new Date("2026-07-01") }, // 0031 -> Overdue
      { status: "Completed", targetDate: new Date("2025-10-01") }, // 0013
    ];
    const chart = computeActionStatusChart(actions, TODAY);
    expect(chart).toEqual([
      { bucket: "Completed", count: 2 },
      { bucket: "Verified", count: 1 },
      { bucket: "Cancelled", count: 1 },
      { bucket: "Overdue", count: 3 },
      { bucket: "Open", count: 0 },
      { bucket: "Assigned", count: 1 },
      { bucket: "InProgress", count: 0 },
    ]);
    expect(chart.reduce((sum, b) => sum + b.count, 0)).toBe(8);
    expect(computeOverdueCorrectiveActionsCount(actions, TODAY)).toBe(3);
  });

  it("computes the Contributing-Factor Distribution across all 10 categories, including zero-count", () => {
    const factors: FactorCategory[] = [
      "Procedures", "Procedures", "Procedures", "Procedures",
      "HumanFactors",
      "Training",
      "Equipment",
    ];
    const chart = computeContributingFactorChart(factors);
    const byCategory = Object.fromEntries(chart.map((c) => [c.category, c.count]));
    expect(byCategory.Procedures).toBe(4);
    expect(byCategory.HumanFactors).toBe(1);
    expect(byCategory.Training).toBe(1);
    expect(byCategory.Equipment).toBe(1);
    expect(byCategory.Environment).toBe(0);
    expect(chart).toHaveLength(10);
    expect(chart.reduce((sum, c) => sum + c.count, 0)).toBe(7);
  });
});
