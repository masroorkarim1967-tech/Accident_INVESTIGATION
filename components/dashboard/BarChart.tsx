export interface BarChartDatum {
  label: string;
  value: number;
  colorVar?: string;
}

/**
 * Shared horizontal ranked-bar renderer (ui-spec.md §4 ChartCard) — backs
 * Investigations by Occurrence Category, Incidents by Location,
 * Contributing-Factor Distribution, and Corrective-Action Status. Plain
 * CSS bars rather than a charting library, consistent with this project's
 * no-external-dependency footprint (non-functional-requirements.md
 * NFR-1.1/1.2).
 */
export function BarChart({ data }: { data: BarChartDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1" tabIndex={0} role="group" aria-label="Chart data">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-32 shrink-0 truncate text-muted" title={d.label}>
            {d.label}
          </span>
          <div className="h-3 flex-1 rounded bg-background">
            <div
              className="h-3 rounded"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.colorVar ?? "var(--color-teal)" }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
