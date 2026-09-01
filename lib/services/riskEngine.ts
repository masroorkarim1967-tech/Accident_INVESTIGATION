import { db } from "@/lib/db";
import {
  RiskLikelihood,
  RiskSeverity,
  InvestigationPriority,
  OccurrenceCategory,
} from "@/prisma/generated/prisma/client";

/**
 * Shared risk-calculation engine (data-model.md §6.1-§6.5). Introduced here
 * because Occurrence risk (FR-067) is the first consumer; Phase 7's Hazard
 * module reuses these same functions rather than a second implementation —
 * "one formula, one implementation, reused everywhere" (§6.3).
 *
 * Educational risk model disclaimer (product-spec.md §11.5): this is a
 * simplified, configurable model for demonstration purposes, not an
 * official regulatory risk assessment methodology.
 */

const LIKELIHOOD_WEIGHT: Record<RiskLikelihood, number> = {
  Rare: 1,
  Unlikely: 2,
  Possible: 3,
  Likely: 4,
  AlmostCertain: 5,
};

const SEVERITY_WEIGHT: Record<RiskSeverity, number> = {
  Negligible: 1,
  Minor: 2,
  Moderate: 3,
  Major: 4,
  Catastrophic: 5,
};

/** data-model.md §6.3: Risk Score = Likelihood(1-5) x Severity(1-5), range 1-25. */
export function calculateRiskScore(likelihood: RiskLikelihood, severity: RiskSeverity): number {
  return LIKELIHOOD_WEIGHT[likelihood] * SEVERITY_WEIGHT[severity];
}

export interface ResolvedBand {
  bandLabel: string;
  colorHint: string | null;
}

/**
 * data-model.md §6.4: resolves a 1-25 score against the currently-active
 * RiskBandConfiguration rows. Bands are configured data, not hardcoded
 * logic, so this always queries the database rather than using a fixed
 * mapping — the whole point of "configurable."
 */
export async function resolveRiskBand(score: number): Promise<ResolvedBand> {
  const band = await db.riskBandConfiguration.findFirst({
    where: { isActive: true, minScore: { lte: score }, maxScore: { gte: score } },
  });

  if (!band) {
    // Integrity rule (data-model.md §6.4) says active bands must cover the
    // full 1-25 range with no gaps — reaching here means that invariant
    // was violated (e.g. no bands seeded yet). Fail loudly rather than
    // silently returning an unlabeled risk.
    throw new Error(`No active RiskBandConfiguration covers score ${score} — check seed data.`);
  }

  return { bandLabel: band.bandLabel, colorHint: band.colorHint };
}

/**
 * data-model.md §6.5: Investigation Priority matrix (severity x risk band),
 * with the Dangerous Goods / Security-Related category floor rule (never
 * lowers priority, only raises it to at least Elevated).
 *
 * The matrix is defined against the four seeded default band labels
 * (Low/Moderate/High/Critical, data-model.md §6.4's seed). If an
 * Administrator renames a band (Phase 7, FR-069), an unrecognized label
 * falls back to the most conservative row (Critical) rather than silently
 * under-prioritizing — a deliberate fail-safe, not a spec requirement.
 */
const PRIORITY_MATRIX: Record<RiskSeverity, Record<"Low" | "Moderate" | "High" | "Critical", InvestigationPriority>> = {
  Negligible: { Low: "Routine", Moderate: "Routine", High: "Elevated", Critical: "Elevated" },
  Minor: { Low: "Routine", Moderate: "Routine", High: "Elevated", Critical: "Elevated" },
  Moderate: { Low: "Routine", Moderate: "Elevated", High: "Elevated", Critical: "Urgent" },
  Major: { Low: "Elevated", Moderate: "Urgent", High: "Urgent", Critical: "Immediate" },
  Catastrophic: { Low: "Urgent", Moderate: "Urgent", High: "Immediate", Critical: "Immediate" },
};

const PRIORITY_RANK: Record<InvestigationPriority, number> = {
  Routine: 0,
  Elevated: 1,
  Urgent: 2,
  Immediate: 3,
};

const FLOOR_CATEGORIES: OccurrenceCategory[] = ["DangerousGoodsIncident", "SecurityRelatedOccurrence"];

export function resolveInvestigationPriority(
  severity: RiskSeverity,
  riskBandLabel: string,
  category: OccurrenceCategory | null,
): InvestigationPriority {
  const bandKey = (["Low", "Moderate", "High", "Critical"] as const).includes(riskBandLabel as never)
    ? (riskBandLabel as "Low" | "Moderate" | "High" | "Critical")
    : "Critical";

  let priority = PRIORITY_MATRIX[severity][bandKey];

  if (category && FLOOR_CATEGORIES.includes(category) && PRIORITY_RANK[priority] < PRIORITY_RANK.Elevated) {
    priority = "Elevated";
  }

  return priority;
}

/** The more severe of two severity ratings, per data-model.md §3.3's `severity` computation rule. */
export function moreSevere(a: RiskSeverity, b: RiskSeverity): RiskSeverity {
  return SEVERITY_WEIGHT[a] >= SEVERITY_WEIGHT[b] ? a : b;
}
