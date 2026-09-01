"use client";

/**
 * SuggestionChip (ui-spec.md §4, product-spec.md §11.1): dashed-border chip
 * in teal/violet with an understated circuit-glyph icon — deliberately not
 * a sparkle/magic-wand, to visually reinforce "rule-based aid," never
 * "magic AI" (ui-spec.md §1.4). Every Investigation Support output uses
 * this component so the label and non-authoritative styling are never
 * reinvented per feature.
 */
export function SuggestionChip({
  label,
  children,
  onAccept,
  onDismiss,
}: {
  /** Exact mandated label, e.g. "Investigation Support · Suggested Classification". */
  label: string;
  children: React.ReactNode;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded border border-dashed border-teal bg-teal/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal">
        <span aria-hidden="true">◇</span>
        {label}
      </div>
      <div className="mt-2 text-sm text-foreground">{children}</div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded border border-teal px-2 py-1 text-xs text-teal hover:bg-teal/10"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
