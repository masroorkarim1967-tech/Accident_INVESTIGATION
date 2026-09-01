"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { OwnerOption, InvestigationOption } from "@/lib/services/actionQueries";

const STATUS_OPTIONS = ["Open", "Assigned", "InProgress", "Completed", "Verified", "Cancelled", "Overdue"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

/**
 * FR-070 — Owner/Status/Priority/Investigation multi-select filters plus a
 * Target Date range, AND-combined and persisted in the URL (comma-separated
 * values per param), the same pattern InvestigationFilterBar.tsx
 * established for FR-059-061, extended here for multi-select.
 */
export function ActionTrackerFilterBar({
  ownerOptions,
  investigationOptions,
}: {
  ownerOptions: OwnerOption[];
  investigationOptions: InvestigationOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function getList(key: string): string[] {
    const raw = searchParams.get(key);
    return raw ? raw.split(",").filter(Boolean) : [];
  }

  function toggleListParam(key: string, value: string) {
    const current = getList(key);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set(key, next.join(","));
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectedStatuses = getList("status");
  const selectedPriorities = getList("priority");
  const selectedOwners = getList("owner");
  const selectedInvestigations = getList("investigation");

  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    selectedOwners.length > 0 ||
    selectedInvestigations.length > 0 ||
    Boolean(searchParams.get("dateFrom")) ||
    Boolean(searchParams.get("dateTo"));

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface p-4">
      <div className="flex flex-wrap gap-6">
        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs text-muted">Status</legend>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => (
              <label key={status} className="flex items-center gap-1 text-xs text-foreground">
                <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleListParam("status", status)} />
                {status}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs text-muted">Priority</legend>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((priority) => (
              <label key={priority} className="flex items-center gap-1 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={selectedPriorities.includes(priority)}
                  onChange={() => toggleListParam("priority", priority)}
                />
                {priority}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="owner" className="text-xs text-muted">Owner</label>
          <select
            id="owner"
            multiple
            size={4}
            value={selectedOwners}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (o) => o.value);
              const params = new URLSearchParams(searchParams.toString());
              if (values.length > 0) params.set("owner", values.join(","));
              else params.delete("owner");
              router.push(`${pathname}?${params.toString()}`);
            }}
            className="min-w-[10rem] rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {ownerOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="investigation" className="text-xs text-muted">Investigation</label>
          <select
            id="investigation"
            multiple
            size={4}
            value={selectedInvestigations}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (o) => o.value);
              const params = new URLSearchParams(searchParams.toString());
              if (values.length > 0) params.set("investigation", values.join(","));
              else params.delete("investigation");
              router.push(`${pathname}?${params.toString()}`);
            }}
            className="min-w-[14rem] rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {investigationOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dateFrom" className="text-xs text-muted">Target Date from</label>
          <input
            id="dateFrom"
            type="date"
            defaultValue={searchParams.get("dateFrom") ?? ""}
            onChange={(e) => updateParam("dateFrom", e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dateTo" className="text-xs text-muted">Target Date to</label>
          <input
            id="dateTo"
            type="date"
            defaultValue={searchParams.get("dateTo") ?? ""}
            onChange={(e) => updateParam("dateTo", e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div>
          <Button type="button" variant="secondary" onClick={() => router.push(pathname)}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
