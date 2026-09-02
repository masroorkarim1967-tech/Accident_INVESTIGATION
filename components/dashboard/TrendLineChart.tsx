export interface TrendChartDatum {
  month: string; // "YYYY-MM"
  count: number;
}

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 40;

/** Monthly Investigation Trend line (ui-spec.md §2 ChartCard ×6). */
export function TrendLineChart({ data }: { data: TrendChartDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? VIEW_WIDTH / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: VIEW_HEIGHT - (d.count / max) * VIEW_HEIGHT,
  }));

  return (
    <div>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="h-24 w-full" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle key={data[i].month} cx={p.x} cy={p.y} r={1.2} fill="var(--color-teal)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        {data.map((d) => (
          <span key={d.month} className="font-mono">
            {d.month.slice(5)}
          </span>
        ))}
      </div>
      <span className="sr-only">
        {data.map((d) => `${d.month}: ${d.count}`).join(", ")}
      </span>
    </div>
  );
}
