import type { RiskLikelihood, RiskSeverity } from "@/prisma/generated/prisma/client";

const LIKELIHOOD_ORDER: RiskLikelihood[] = ["Rare", "Unlikely", "Possible", "Likely", "AlmostCertain"];
const SEVERITY_ORDER: RiskSeverity[] = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

const COLOR_HINT_CLASSES: Record<string, string> = {
  green: "bg-green/20 text-green",
  amber: "bg-amber/20 text-amber",
  orange: "bg-orange/20 text-orange",
  red: "bg-red/20 text-red",
};

export interface RiskGridBand {
  minScore: number;
  maxScore: number;
  colorHint: string | null;
}

export interface RiskGridPoint {
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  score: number;
}

function cellClasses(score: number, bands: RiskGridBand[]): string {
  const band = bands.find((b) => score >= b.minScore && score <= b.maxScore);
  if (!band?.colorHint) return "bg-surface text-muted";
  return COLOR_HINT_CLASSES[band.colorHint] ?? "bg-surface text-muted";
}

/**
 * ui-spec.md §11 — one shared 5x5 Likelihood/Severity grid plotting
 * Initial and Residual Risk as two distinctly-outlined markers on the
 * same grid (rather than two separate grids), so the risk-reduction
 * effect of existing controls is visible at a glance. ui-spec.md also
 * suggests connecting the two markers with an arrow when they differ;
 * this implementation omits that refinement — the two outline colors
 * plus each cell's own score/band coloring already convey the same
 * before/after comparison without it.
 */
export function RiskGrid({
  bands,
  initial,
  residual,
}: {
  bands: RiskGridBand[];
  initial: RiskGridPoint | null;
  residual: RiskGridPoint | null;
}) {
  return (
    <div
      className="overflow-x-auto rounded border border-border bg-background p-3"
      data-testid="risk-matrix-grid"
      tabIndex={0}
      role="group"
      aria-label="Risk matrix, likelihood by severity"
    >
      <div className="grid min-w-[280px] grid-cols-[auto_repeat(5,1fr)] gap-1">
        <div />
        {SEVERITY_ORDER.map((severity, i) => (
          <div key={severity} className="text-center text-[10px] text-muted">
            {i + 1}
          </div>
        ))}
        {[...LIKELIHOOD_ORDER].reverse().map((likelihood) => (
          <div key={likelihood} className="contents">
            <div className="flex items-center justify-end pr-1 text-[10px] text-muted">
              {LIKELIHOOD_ORDER.indexOf(likelihood) + 1}
            </div>
            {SEVERITY_ORDER.map((severity) => {
              const score = (LIKELIHOOD_ORDER.indexOf(likelihood) + 1) * (SEVERITY_ORDER.indexOf(severity) + 1);
              const isInitial = initial?.likelihood === likelihood && initial?.severity === severity;
              const isResidual = residual?.likelihood === likelihood && residual?.severity === severity;
              return (
                <div
                  key={`${likelihood}-${severity}`}
                  className={`flex h-9 items-center justify-center rounded font-mono text-xs ${cellClasses(score, bands)}`}
                >
                  <span
                    className={
                      isInitial && isResidual
                        ? "rounded-full border-2 border-dashed border-foreground px-1"
                        : isInitial
                          ? "rounded-full border-2 border-foreground px-1"
                          : isResidual
                            ? "rounded-full border-2 border-teal px-1"
                            : ""
                    }
                  >
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-foreground" /> Initial
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-teal" /> Residual
        </span>
        <span>Axes: Likelihood (rows) x Severity (columns), 1-5.</span>
      </div>
    </div>
  );
}
