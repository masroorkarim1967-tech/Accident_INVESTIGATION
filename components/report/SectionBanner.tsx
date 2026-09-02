export type BannerKind = "FACTS" | "ASSESSMENT" | "RECOMMENDATIONS" | "ADMIN" | "STANDING";

const BANNER: Record<BannerKind, { label: string; className: string }> = {
  FACTS: { label: "FACTS", className: "border-slate bg-slate/10 text-slate" },
  ASSESSMENT: { label: "INVESTIGATOR ASSESSMENT", className: "border-violet bg-violet/10 text-violet" },
  RECOMMENDATIONS: { label: "RECOMMENDATIONS", className: "border-amber bg-amber/10 text-amber" },
  ADMIN: { label: "ADMINISTRATIVE RECORD", className: "border-blue bg-blue/10 text-blue" },
  STANDING: { label: "STANDING NOTICE", className: "border-slate bg-slate/10 text-slate" },
};

/**
 * report-spec.md §3 — the FACTS/INVESTIGATOR ASSESSMENT/RECOMMENDATIONS/
 * ADMINISTRATIVE RECORD classification banner. Renders identically in
 * screen and print CSS (§7) — this is core report content, not a
 * screen-only affordance, so it carries no `print:hidden` variant.
 */
export function SectionBanner({ kind }: { kind: BannerKind }) {
  const { label, className } = BANNER[kind];
  return (
    <div className={`mb-2 inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${className}`}>
      {label}
    </div>
  );
}
