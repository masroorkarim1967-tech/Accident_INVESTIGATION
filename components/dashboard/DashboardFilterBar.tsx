"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Open", label: "Open" },
  { value: "UnderInvestigation", label: "Under Investigation" },
  { value: "Analysis", label: "Analysis" },
  { value: "Review", label: "Review" },
  { value: "Closed", label: "Closed" },
];
const SEVERITY_OPTIONS = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];
const CATEGORY_OPTIONS = [
  { value: "AircraftIncident", label: "Aircraft Incident" },
  { value: "GroundHandlingIncident", label: "Ground Handling Incident" },
  { value: "RampSafetyIncident", label: "Ramp Safety Incident" },
  { value: "BaggageIncident", label: "Baggage Incident" },
  { value: "CargoIncident", label: "Cargo Incident" },
  { value: "DangerousGoodsIncident", label: "Dangerous Goods Incident" },
  { value: "PassengerHandlingIncident", label: "Passenger Handling Incident" },
  { value: "SecurityRelatedOccurrence", label: "Security-Related Occurrence" },
  { value: "OccupationalSafetyIncident", label: "Occupational Safety Incident" },
  { value: "EquipmentVehicleIncident", label: "Equipment/Vehicle Incident" },
  { value: "MaintenanceRelatedOccurrence", label: "Maintenance-Related Occurrence" },
  { value: "EnvironmentalOccurrence", label: "Environmental Occurrence" },
  { value: "NearMiss", label: "Near Miss" },
  { value: "Other", label: "Other" },
];

/**
 * ui-spec.md §2 Dashboard Filter Bar — 6 controls (Date Range, Status,
 * Occurrence Category, Airport/Location, Aircraft Type, Investigation
 * Severity), AND-combined and persisted in the URL, the same
 * checkbox/multi-select/date-input pattern established by
 * ActionTrackerFilterBar.tsx (FR-065).
 */
export function DashboardFilterBar({
  aerodromeOptions,
  aircraftOptions,
  dateRangeError,
}: {
  aerodromeOptions: string[];
  aircraftOptions: string[];
  dateRangeError?: boolean;
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
    setListParam(key, next);
  }

  function setListParam(key: string, values: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (values.length > 0) params.set(key, values.join(","));
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectedStatuses = getList("status");
  const selectedSeverities = getList("severity");
  const selectedCategories = getList("category");
  const selectedAerodromes = getList("aerodrome");
  const selectedAircraft = getList("aircraft");
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const activeFilterCount = [
    selectedStatuses.length > 0,
    selectedSeverities.length > 0,
    selectedCategories.length > 0,
    selectedAerodromes.length > 0,
    selectedAircraft.length > 0,
    Boolean(dateFrom || dateTo),
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="dateFrom" className="text-xs text-muted">
            Date from
          </label>
          <input
            id="dateFrom"
            type="date"
            defaultValue={dateFrom}
            onChange={(e) => updateParam("dateFrom", e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dateTo" className="text-xs text-muted">
            Date to
          </label>
          <input
            id="dateTo"
            type="date"
            defaultValue={dateTo}
            onChange={(e) => updateParam("dateTo", e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs text-muted">Status</legend>
          <div className="flex max-w-xs flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => (
              <label key={status.value} className="flex items-center gap-1 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status.value)}
                  onChange={() => toggleListParam("status", status.value)}
                />
                {status.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs text-muted">Severity</legend>
          <div className="flex max-w-xs flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((severity) => (
              <label key={severity} className="flex items-center gap-1 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={selectedSeverities.includes(severity)}
                  onChange={() => toggleListParam("severity", severity)}
                />
                {severity}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-xs text-muted">
            Occurrence Category
          </label>
          <select
            id="category"
            multiple
            size={4}
            value={selectedCategories}
            onChange={(e) => setListParam("category", Array.from(e.target.selectedOptions, (o) => o.value))}
            className="min-w-[14rem] rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="aerodrome" className="text-xs text-muted">
            Airport/Location
          </label>
          <select
            id="aerodrome"
            multiple
            size={4}
            value={selectedAerodromes}
            onChange={(e) => setListParam("aerodrome", Array.from(e.target.selectedOptions, (o) => o.value))}
            className="min-w-[10rem] rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {aerodromeOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="aircraft" className="text-xs text-muted">
            Aircraft Type
          </label>
          <select
            id="aircraft"
            multiple
            size={4}
            value={selectedAircraft}
            onChange={(e) => setListParam("aircraft", Array.from(e.target.selectedOptions, (o) => o.value))}
            className="min-w-[10rem] rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {aircraftOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dateRangeError && (
        <p className="text-xs text-red">Date from must be on or before Date to — the date range filter has not been applied.</p>
      )}

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
          </span>
          <Button type="button" variant="ghost" onClick={() => router.push(pathname)}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
