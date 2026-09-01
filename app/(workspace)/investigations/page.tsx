import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { listInvestigations, type InvestigationSortColumn, type SortDirection } from "@/lib/services/investigationQueries";
import { InvestigationStatus, UserRole } from "@/prisma/generated/prisma/client";
import { InvestigationFilterBar } from "@/components/investigations/InvestigationFilterBar";
import { StageBadge } from "@/components/ui/StageBadge";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Investigations — Aviation Incident Investigation Assistant",
};

const SORT_COLUMNS: { key: InvestigationSortColumn; label: string }[] = [
  { key: "referenceNumber", label: "Reference #" },
  { key: "occurrenceDate", label: "Occurrence Date" },
  { key: "updatedAt", label: "Updated At" },
];

function isValidStatus(value: string | undefined): value is InvestigationStatus {
  return !!value && value in InvestigationStatus;
}

function isValidSortColumn(value: string | undefined): value is InvestigationSortColumn {
  return value === "referenceNumber" || value === "occurrenceDate" || value === "updatedAt";
}

/**
 * FR-007's role-specific empty-state copy — distinct from the generic
 * "no matches"/"none exist" messages for other roles.
 */
function emptyStateMessage(role: UserRole, hasActiveFilters: boolean): string {
  if (!hasActiveFilters && role === UserRole.Investigator) {
    return "You have no assigned investigations yet.";
  }
  if (hasActiveFilters && role === UserRole.Viewer) {
    return "No closed investigations match this view yet.";
  }
  return hasActiveFilters ? "No investigations match these filters." : "No investigations to show.";
}

export default async function InvestigationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const params = await searchParams;
  const sortColumn = isValidSortColumn(params.sort) ? params.sort : "updatedAt";
  const sortDirection: SortDirection = params.dir === "asc" ? "asc" : "desc";

  const result = await listInvestigations({
    currentUser: { id: currentUser.id, role: currentUser.role },
    search: params.search,
    status: isValidStatus(params.status) ? params.status : undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sortColumn,
    sortDirection,
    page: params.page ? Number(params.page) : 1,
  });

  function sortHref(column: InvestigationSortColumn) {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
    );
    next.set("sort", column);
    next.set("dir", sortColumn === column && sortDirection === "asc" ? "desc" : "asc");
    return `/investigations?${next.toString()}`;
  }

  function pageHref(page: number) {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
    );
    next.set("page", String(page));
    return `/investigations?${next.toString()}`;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-lg font-semibold text-foreground">Investigations</h1>
        <Link href="/investigations/new">
          <Button>+ New Investigation</Button>
        </Link>
      </div>

      <InvestigationFilterBar />

      {result.items.length === 0 ? (
        <div className="p-8 text-center text-muted">
          {emptyStateMessage(
            currentUser.role,
            Boolean(params.search || params.status || params.dateFrom || params.dateTo),
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-border bg-surface text-left text-xs uppercase text-muted">
              <tr>
                {SORT_COLUMNS.map((column) => (
                  <th key={column.key} className="px-4 py-2">
                    <Link href={sortHref(column.key)} className="hover:text-teal">
                      {column.label}
                      {sortColumn === column.key ? (sortDirection === "asc" ? " ▲" : " ▼") : ""}
                    </Link>
                  </th>
                ))}
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created By</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-surface">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/investigations/${item.id}`} className="text-teal hover:underline">
                      {item.referenceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {item.occurrenceDateUtc ? item.occurrenceDateUtc.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono">{item.updatedAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-foreground">
                    <Link href={`/investigations/${item.id}`} className="hover:text-teal hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StageBadge status={item.status} />
                  </td>
                  <td className="px-4 py-2 text-muted">{item.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 p-4">
          {Array.from({ length: result.pageCount }, (_, index) => index + 1).map((page) => (
            <Link
              key={page}
              href={pageHref(page)}
              className={`rounded px-3 py-1 text-sm ${
                page === result.page ? "bg-amber text-background" : "text-muted hover:text-teal"
              }`}
            >
              {page}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
