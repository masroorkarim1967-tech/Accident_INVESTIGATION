export interface DonutChartDatum {
  label: string;
  value: number;
  colorVar: string;
}

/**
 * Investigations by Status donut (ui-spec.md §2 ChartCard ×6). A
 * conic-gradient ring rather than an SVG arc library — the same
 * hand-rolled-CSS approach as the Login page's radar-sweep (globals.css).
 * Color always pairs with a text label in the legend (§5 Accessibility:
 * "never color alone").
 */
export function DonutChart({ data }: { data: DonutChartDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const stops = data.reduce<{ cursor: number; segments: string[] }>(
    (acc, d) => {
      const start = (acc.cursor / total) * 360;
      const end = ((acc.cursor + d.value) / total) * 360;
      return { cursor: acc.cursor + d.value, segments: [...acc.segments, `${d.colorVar} ${start}deg ${end}deg`] };
    },
    { cursor: 0, segments: [] },
  ).segments;
  const mask = "radial-gradient(farthest-side, transparent 60%, black 61%)";

  return (
    <div className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className="h-28 w-28 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})`, WebkitMask: mask, mask }}
      />
      <ul className="flex flex-col gap-1 text-xs">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.colorVar }} />
            <span className="text-muted">{d.label}</span>
            <span className="font-mono text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
