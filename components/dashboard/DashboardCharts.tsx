import { ChartCard } from "@/components/ui/ChartCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { TrendLineChart } from "@/components/dashboard/TrendLineChart";
import type { DashboardData } from "@/lib/services/dashboardQueries";

/** Matches StageBadge.tsx's STAGE_COLOR_CLASSES palette (ui-spec.md §1.2). */
const STATUS_LABELS: Record<string, string> = {
  Draft: "Draft",
  Open: "Open",
  UnderInvestigation: "Under Investigation",
  Analysis: "Analysis",
  Review: "Review",
  Closed: "Closed",
};
const STATUS_COLORS: Record<string, string> = {
  Draft: "var(--color-slate)",
  Open: "var(--color-blue)",
  UnderInvestigation: "var(--color-teal)",
  Analysis: "var(--color-amber)",
  Review: "var(--color-violet)",
  Closed: "var(--color-green)",
};

/** Same wording as components/occurrence/ClassificationPanel.tsx's CATEGORY_LABELS. */
const CATEGORY_LABELS: Record<string, string> = {
  AircraftIncident: "Aircraft Incident",
  GroundHandlingIncident: "Ground Handling Incident",
  RampSafetyIncident: "Ramp Safety Incident",
  BaggageIncident: "Baggage Incident",
  CargoIncident: "Cargo Incident",
  DangerousGoodsIncident: "Dangerous Goods Incident",
  PassengerHandlingIncident: "Passenger Handling Incident",
  SecurityRelatedOccurrence: "Security-Related Occurrence",
  OccupationalSafetyIncident: "Occupational Safety Incident",
  EquipmentVehicleIncident: "Equipment/Vehicle Incident",
  MaintenanceRelatedOccurrence: "Maintenance-Related Occurrence",
  EnvironmentalOccurrence: "Environmental Occurrence",
  NearMiss: "Near Miss",
  Other: "Other",
  Unclassified: "Unclassified",
};

/** Same wording as components/rootcause/ContributingFactorPanel.tsx's FACTOR_CATEGORY_LABELS. */
const FACTOR_LABELS: Record<string, string> = {
  HumanFactors: "Human Factors",
  Equipment: "Equipment",
  Environment: "Environment",
  Procedures: "Procedures",
  Training: "Training",
  Supervision: "Supervision",
  Communication: "Communication",
  Organization: "Organization",
  Management: "Management",
  ExternalFactors: "External Factors",
};

/** Matches components/actions/ActionStatusBadge.tsx's STATUS_COLOR_CLASSES + OverdueIndicator's red. */
const ACTION_STATUS_LABELS: Record<string, string> = {
  Completed: "Completed",
  Verified: "Verified",
  Cancelled: "Cancelled",
  Overdue: "Overdue",
  Open: "Open",
  Assigned: "Assigned",
  InProgress: "In Progress",
};
const ACTION_STATUS_COLORS: Record<string, string> = {
  Completed: "var(--color-teal)",
  Verified: "var(--color-green)",
  Cancelled: "var(--color-slate)",
  Overdue: "var(--color-red)",
  Open: "var(--color-slate)",
  Assigned: "var(--color-blue)",
  InProgress: "var(--color-amber)",
};

/**
 * The 6 ChartCards (ui-spec.md §2 Dashboard, functional-requirements.md
 * §1.0.3). Chart segments are not drill-down links in this revision — the
 * Investigations list (§3) does not yet accept the Occurrence
 * Category/Aerodrome/Aircraft/Severity filter dimensions needed for a
 * faithful pre-filtered link, so a non-interactive chart is preferred over
 * a link that would silently drop filters.
 */
export function DashboardCharts({ data }: { data: DashboardData }) {
  const totalInvestigations = data.tiles.total;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard title="Investigations by Status" isEmpty={totalInvestigations === 0}>
        <DonutChart
          data={data.statusChart.map((s) => ({
            label: STATUS_LABELS[s.status] ?? s.status,
            value: s.count,
            colorVar: STATUS_COLORS[s.status] ?? "var(--color-slate)",
          }))}
        />
      </ChartCard>

      <ChartCard title="Investigations by Occurrence Category" isEmpty={totalInvestigations === 0}>
        <BarChart
          data={data.categoryChart.map((c) => ({
            label: CATEGORY_LABELS[c.category] ?? c.category,
            value: c.count,
            colorVar: c.category === "Unclassified" ? "var(--color-slate)" : "var(--color-teal)",
          }))}
        />
      </ChartCard>

      <ChartCard title="Incidents by Location" isEmpty={totalInvestigations === 0}>
        <BarChart
          data={data.locationChart.map((l) => ({
            label: l.label,
            value: l.count,
            colorVar: l.label === "Unspecified" || l.label === "Other" ? "var(--color-slate)" : "var(--color-teal)",
          }))}
        />
      </ChartCard>

      <ChartCard title="Contributing-Factor Distribution" isEmpty={totalInvestigations === 0}>
        <BarChart
          data={data.contributingFactorChart.map((f) => ({
            label: FACTOR_LABELS[f.category] ?? f.category,
            value: f.count,
            colorVar: "var(--color-teal)",
          }))}
        />
      </ChartCard>

      <ChartCard title="Corrective-Action Status" isEmpty={totalInvestigations === 0}>
        <BarChart
          data={data.actionStatusChart.map((a) => ({
            label: ACTION_STATUS_LABELS[a.bucket] ?? a.bucket,
            value: a.count,
            colorVar: ACTION_STATUS_COLORS[a.bucket] ?? "var(--color-teal)",
          }))}
        />
      </ChartCard>

      <ChartCard title="Monthly Investigation Trend" isEmpty={totalInvestigations === 0}>
        <TrendLineChart data={data.trendChart} />
        {data.trendTruncated && (
          <p className="text-[10px] text-muted">Date range exceeds 24 months — trend capped at 24 months.</p>
        )}
      </ChartCard>
    </div>
  );
}
