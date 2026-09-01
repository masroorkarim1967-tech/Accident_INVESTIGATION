import Link from "next/link";

/**
 * AdvisoryBanner — shared display for every Category A (Advisory)
 * Investigation Support output (assistance-engine.md §3.3): informational
 * only, no Accept/Dismiss (unlike SuggestionChip, which is Category B).
 * Same understated teal circuit-glyph treatment as SuggestionChip so every
 * Investigation Support surface reads as one family
 * (`ui-spec.md` §1.4/§4).
 *
 * When `items` is empty and `emptyMessage` is omitted, renders nothing —
 * correct for capabilities where silence itself is the positive outcome
 * (Missing-Information Warnings, assistance-engine.md §4.2). Pass
 * `emptyMessage` for capabilities that must always render a result,
 * positive or negative (Checklist Suggestions §4.1, Report Quality Checks
 * §4.8).
 */
export function AdvisoryBanner({
  label,
  items,
  emptyMessage,
  caption,
}: {
  /** Exact mandated label, e.g. "Investigation Support · Risk Warning". */
  label: string;
  items: { message: string; href?: string }[];
  emptyMessage?: string;
  caption?: string;
}) {
  if (items.length === 0 && !emptyMessage) return null;

  return (
    <div className="rounded border border-dashed border-teal bg-teal/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal">
        <span aria-hidden="true">◇</span>
        {label}
      </div>
      <div className="mt-2 flex flex-col gap-1.5 text-sm text-foreground">
        {items.length === 0 ? (
          <p className="text-muted">{emptyMessage}</p>
        ) : (
          items.map((item, i) =>
            item.href ? (
              <Link key={i} href={item.href} className="hover:underline">
                {item.message}
              </Link>
            ) : (
              <p key={i}>{item.message}</p>
            ),
          )
        )}
      </div>
      {caption && <p className="mt-2 text-xs italic text-muted">{caption}</p>}
    </div>
  );
}
