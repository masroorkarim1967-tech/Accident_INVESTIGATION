import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getDashboardData, type DashboardFilters } from "@/lib/services/dashboardQueries";
import { InvestigationStatus, OccurrenceCategory, RiskSeverity, UserRole } from "@/prisma/generated/prisma/client";
import { StatTile } from "@/components/ui/StatTile";
import { StageBadge } from "@/components/ui/StageBadge";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Button } from "@/components/ui/Button";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

export const metadata: Metadata = {
  title: "Dashboard — Aviation Incident Investigation Assistant",
};

const CREATE_ROLES: UserRole[] = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

function parseList<T extends string>(value: string | undefined, validValues: readonly T[]): T[] {
  if (!value) return [];
  return value.split(",").filter((v): v is T => (validValues as readonly string[]).includes(v));
}

/**
 * ui-spec.md §2 Dashboard — functional-requirements.md §1.0's Operations
 * Overview: 7 StatTiles, 6 ChartCards, a Recent Investigations table, all
 * driven by the 6-dimension Filter Bar (FR-065), persisted in the URL.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const params = await searchParams;

  const rawDateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const rawDateTo = params.dateTo ? new Date(params.dateTo) : undefined;
  const dateRangeError = Boolean(rawDateFrom && rawDateTo && rawDateFrom > rawDateTo);

  const filters: DashboardFilters = {
    dateFrom: dateRangeError ? undefined : rawDateFrom,
    dateTo: dateRangeError ? undefined : rawDateTo,
    status: parseList(params.status, Object.values(InvestigationStatus)),
    category: parseList(params.category, Object.values(OccurrenceCategory)),
    aerodrome: params.aerodrome ? params.aerodrome.split(",").filter(Boolean) : undefined,
    aircraft: params.aircraft ? params.aircraft.split(",").filter(Boolean) : undefined,
    severity: parseList(params.severity, Object.values(RiskSeverity)),
  };

  const data = await getDashboardData(filters);

  const hasActiveFilters = Boolean(
    params.status || params.category || params.aerodrome || params.aircraft || params.severity || params.dateFrom || params.dateTo,
  );
  const canCreateInvestigation = CREATE_ROLES.includes(currentUser.role);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-teal">Operations Overview</p>
        <h1 className="mt-1 text-lg font-semibold text-foreground">Dashboard</h1>
      </div>

      <DashboardFilterBar
        aerodromeOptions={data.filterOptions.aerodromes}
        aircraftOptions={data.filterOptions.aircraftModels}
        dateRangeError={dateRangeError}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <StatTile label="Total Investigations" value={data.tiles.total} href="/investigations" />
        <StatTile label="Open Investigations" value={data.tiles.open} accentClassName="border-t-blue" />
        <StatTile label="Under Investigation" value={data.tiles.underInvestigation} accentClassName="border-t-teal" />
        <StatTile
          label="Awaiting Review"
          value={data.tiles.awaitingReview}
          href="/investigations?status=Review"
          accentClassName="border-t-violet"
        />
        <StatTile
          label="Closed Investigations"
          value={data.tiles.closed}
          href="/investigations?status=Closed"
          accentClassName="border-t-green"
        />
        <StatTile
          label="Overdue Corrective Actions"
          value={data.tiles.overdueCorrectiveActions}
          href="/action-tracker?status=Overdue"
          accentClassName="border-t-red"
        />
        <StatTile label="High-Risk Findings" value={data.tiles.highRiskFindings} accentClassName="border-t-orange" />
      </div>

      <DashboardCharts data={data} />

      <div className="rounded border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-xs uppercase tracking-wide text-muted">Recent Investigations</h2>
        </div>

        {data.recentInvestigations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            {hasActiveFilters ? (
              <>
                <p className="text-muted">No investigations match these filters.</p>
                <Link href="/dashboard">
                  <Button variant="ghost">Clear filters</Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-muted">No investigations recorded yet.</p>
                {canCreateInvestigation && (
                  <Link href="/investigations/new">
                    <Button>Create investigation</Button>
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2">Reference #</th>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Severity</th>
                  <th className="px-4 py-2">Occurrence Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentInvestigations.map((inv) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-background">
                    <td className="px-4 py-2 font-mono">
                      <Link href={`/investigations/${inv.id}`} className="text-teal hover:underline">
                        {inv.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-foreground">
                      <Link href={`/investigations/${inv.id}`} className="hover:text-teal hover:underline">
                        {inv.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <StageBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-2">
                      <SeverityBadge severity={inv.severity} />
                    </td>
                    <td className="px-4 py-2 font-mono text-muted">
                      {inv.occurrenceDateUtc ? inv.occurrenceDateUtc.toISOString().slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-center border-t border-border p-4">
          <Link href="/investigations">
            <Button variant="secondary">View all investigations</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
