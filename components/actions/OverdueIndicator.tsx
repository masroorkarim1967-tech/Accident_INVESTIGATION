/**
 * OverdueBadge (ui-spec.md §4): red pill + warning-triangle icon; appears
 * only in place of an action's status when derived-overdue (FR-046) —
 * visually distinct from any ActionStatusBadge so it never reads as an
 * ordinary lifecycle state.
 */
export function OverdueIndicator() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red px-2.5 py-0.5 font-mono text-xs text-red">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </svg>
      Overdue
    </span>
  );
}
