/**
 * RiskBadge (ui-spec.md §4): Low=green, Moderate=amber, High=orange,
 * Critical=red. Always renders the score alongside the label (e.g.
 * "16 · High") so the underlying number is never hidden behind the
 * qualitative badge.
 */
const BAND_COLOR_CLASSES: Record<string, string> = {
  Low: "border-green text-green",
  Moderate: "border-amber text-amber",
  High: "border-orange text-orange",
  Critical: "border-red text-red",
};

export function RiskBadge({ score, band }: { score: number | null; band: string | null }) {
  if (score === null || band === null) {
    return <span className="text-sm text-muted">Not yet determined</span>;
  }
  const colorClasses = BAND_COLOR_CLASSES[band] ?? "border-slate text-slate";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs ${colorClasses}`}>
      {score} · {band}
    </span>
  );
}
