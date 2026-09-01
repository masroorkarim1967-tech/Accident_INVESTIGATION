import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  listPortfolioActions,
  listActionOwnerOptions,
  listActionInvestigationOptions,
} from "@/lib/services/actionQueries";
import { ActionStatus, ActionPriority } from "@/prisma/generated/prisma/client";
import { ActionTrackerFilterBar } from "@/components/actions/ActionTrackerFilterBar";
import { ActionStatusBadge } from "@/components/actions/ActionStatusBadge";
import { ActionPriorityBadge } from "@/components/actions/ActionPriorityBadge";

export const metadata: Metadata = {
  title: "Action Tracker — Aviation Incident Investigation Assistant",
};

function parseList<T extends string>(value: string | undefined, validValues: readonly T[]): T[] {
  if (!value) return [];
  return value.split(",").filter((v): v is T => (validValues as readonly string[]).includes(v));
}

/** FR-070 — View Portfolio-Wide Action Tracker. */
export default async function ActionTrackerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const params = await searchParams;

  const STATUS_AND_OVERDUE = [...Object.values(ActionStatus), "Overdue"];
  const statusValues = parseList(params.status, STATUS_AND_OVERDUE);
  const includeOverdue = statusValues.includes("Overdue");
  const statuses = statusValues.filter((s) => s !== "Overdue") as ActionStatus[];
  const priorities = parseList(params.priority, Object.values(ActionPriority));

  const ownerKeys = params.owner ? params.owner.split(",").filter(Boolean) : [];
  const ownerUserIds = ownerKeys.filter((k) => k.startsWith("user:")).map((k) => Number(k.slice(5)));
  const ownerExternalNames = ownerKeys.filter((k) => k.startsWith("external:")).map((k) => k.slice(9));

  const investigationIds = params.investigation ? params.investigation.split(",").map(Number).filter(Number.isInteger) : [];

  const [actions, ownerOptions, investigationOptions] = await Promise.all([
    listPortfolioActions({
      currentUser: { id: currentUser.id, role: currentUser.role },
      statuses,
      includeOverdue,
      priorities,
      ownerUserIds,
      ownerExternalNames,
      investigationIds,
      targetDateFrom: params.dateFrom,
      targetDateTo: params.dateTo,
    }),
    listActionOwnerOptions({ id: currentUser.id, role: currentUser.role }),
    listActionInvestigationOptions({ id: currentUser.id, role: currentUser.role }),
  ]);

  const hasActiveFilters = Boolean(
    params.status || params.priority || params.owner || params.investigation || params.dateFrom || params.dateTo,
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-lg font-semibold text-foreground">Action Tracker</h1>
      </div>

      <ActionTrackerFilterBar ownerOptions={ownerOptions} investigationOptions={investigationOptions} />

      {actions.length === 0 ? (
        <div className="p-8 text-center text-muted">
          {hasActiveFilters ? "No actions match these filters." : "No actions recorded across any investigation yet."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-border bg-surface text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Action ID</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Investigation</th>
                <th className="px-4 py-2">Responsible Person</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Target Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Required</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={`${action.kind}-${action.id}`} className="border-b border-border hover:bg-surface">
                  <td className="px-4 py-2 font-mono text-muted">
                    {action.kind === "Corrective" ? "CA" : "PA"}-{action.id}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2 text-foreground">{action.description}</td>
                  <td className="px-4 py-2 text-muted">{action.kind}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/investigations/${action.investigationId}/actions`}
                      className="text-teal hover:underline"
                    >
                      {action.investigationReference}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{action.ownerName ?? action.ownerExternalName ?? "—"}</td>
                  <td className="px-4 py-2 text-muted">{action.department ?? "—"}</td>
                  <td className="px-4 py-2">
                    <ActionPriorityBadge priority={action.priority} />
                  </td>
                  <td className="px-4 py-2 font-mono">{action.targetDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2">
                    <ActionStatusBadge status={action.status} overdue={action.overdue} />
                  </td>
                  <td className="px-4 py-2 text-muted">{action.requiredForClosure ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
