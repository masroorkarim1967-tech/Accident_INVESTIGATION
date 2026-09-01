"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Open", label: "Open" },
  { value: "UnderInvestigation", label: "Under Investigation" },
  { value: "Analysis", label: "Analysis" },
  { value: "Review", label: "Review" },
  { value: "Closed", label: "Closed" },
];

/**
 * FR-059 (search) + FR-060 (filter) + FR-061 (combine, persist in URL).
 * Severity/Occurrence Category filters are intentionally absent — both
 * depend on Occurrence fields Phase 5 adds.
 */
export function InvestigationFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // A new search/filter combination always returns to page 1.
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    setSearchText(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => updateParam("search", value), 300);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasActiveFilters = Boolean(
    searchParams.get("search") || searchParams.get("status") || searchParams.get("dateFrom") || searchParams.get("dateTo"),
  );

  function clearFilters() {
    setSearchText("");
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="search" className="text-xs text-muted">
          Search
        </label>
        <input
          id="search"
          type="text"
          placeholder="Title or reference number"
          value={searchText}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-teal"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs text-muted">
          Status
        </label>
        <select
          id="status"
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(event) => updateParam("status", event.target.value)}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-teal"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateFrom" className="text-xs text-muted">
          Occurrence from
        </label>
        <input
          id="dateFrom"
          type="date"
          defaultValue={searchParams.get("dateFrom") ?? ""}
          onChange={(event) => updateParam("dateFrom", event.target.value)}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-teal"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateTo" className="text-xs text-muted">
          Occurrence to
        </label>
        <input
          id="dateTo"
          type="date"
          defaultValue={searchParams.get("dateTo") ?? ""}
          onChange={(event) => updateParam("dateTo", event.target.value)}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-teal"
        />
      </div>

      {hasActiveFilters && (
        <Button type="button" variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
