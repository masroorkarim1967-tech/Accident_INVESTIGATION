/**
 * ChartCard (ui-spec.md §4): bordered panel, chart + legend, §1.5 bezel
 * styling — the shared frame for all 6 Dashboard charts. FR-001's Error
 * Behavior: a chart-level failure renders inline rather than failing the
 * whole Dashboard; an empty result set (post-filter) renders its own
 * centered message instead of an empty plot.
 */
export function ChartCard({
  title,
  isEmpty,
  error,
  children,
}: {
  title: string;
  isEmpty?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      <h2 className="text-xs uppercase tracking-wide text-muted">{title}</h2>
      {error ? (
        <div className="flex flex-1 items-center justify-center py-8 text-sm text-red">Chart unavailable</div>
      ) : isEmpty ? (
        <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted">
          No data matches the current filters
        </div>
      ) : (
        children
      )}
    </div>
  );
}
