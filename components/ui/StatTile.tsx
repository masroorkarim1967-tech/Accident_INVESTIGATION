import Link from "next/link";

/**
 * StatTile (ui-spec.md §4): large monospace headline number, small caption
 * label, optional accent color on a thin top border. FR-001's Error
 * Behavior: a tile-level failure renders its own inline message rather
 * than failing the whole Dashboard.
 */
export function StatTile({
  label,
  value,
  href,
  accentClassName,
  error,
}: {
  label: string;
  value: number | null;
  href?: string;
  /** e.g. "border-t-teal" — matches the tile's StageBadge/RiskBadge/OverdueBadge accent color. */
  accentClassName?: string;
  error?: string;
}) {
  const content = (
    <div
      className={`rounded border border-border ${accentClassName ? `border-t-2 ${accentClassName}` : ""} bg-surface p-4`}
    >
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      {error ? (
        <p className="mt-1 text-sm text-red">Unable to load this statistic</p>
      ) : (
        <p className="mt-1 font-mono text-2xl font-semibold text-foreground">{value}</p>
      )}
    </div>
  );

  if (href && !error) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}
