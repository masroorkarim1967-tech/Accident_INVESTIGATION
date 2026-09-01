import type { CompletenessScoreResult } from "@/lib/services/investigationSupportEngine";

/**
 * assistance-engine.md §4.4 — Investigation Completeness Score. Neither
 * Definite nor Inferential (§3.4): a precise coverage calculation, so no
 * confidence tier is shown. The "coverage, not quality" caption is always
 * rendered alongside the number, never only in a help tooltip.
 */
export function CompletenessScoreGauge({ result }: { result: CompletenessScoreResult }) {
  return (
    <div className="rounded border border-dashed border-violet bg-violet/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet">
        <span aria-hidden="true">◇</span>
        {result.label}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="font-mono text-2xl font-semibold text-foreground">{result.percent}%</span>
        <div className="h-2 flex-1 overflow-hidden rounded bg-border">
          <div className="h-full bg-violet" style={{ width: `${result.percent}%` }} />
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">{result.stageContextMessage}</p>
      {result.sections.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-2 text-xs text-muted">
          {result.sections.map((section) => (
            <li key={section.section} className="flex justify-between gap-2">
              <span>{section.section}</span>
              <span className="font-mono">{Math.round((section.populatedWeight / section.totalWeight) * 100)}%</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs italic text-muted">{result.caption}</p>
    </div>
  );
}
