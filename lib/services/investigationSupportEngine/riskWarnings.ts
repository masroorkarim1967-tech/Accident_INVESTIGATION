import { db } from "@/lib/db";
import { InvestigationStatus } from "@/prisma/generated/prisma/client";
import { SUPPORT_LABELS } from "./labels";

/**
 * assistance-engine.md §4.6 — Risk Warnings. Category A, Definite. Each
 * rule is a clear threshold condition over Hazard/Occurrence risk data —
 * never a judgment call. Thresholds are knowledge-base constants
 * (assistance-engine.md AE-4: v1 defaults, not tuned values, intentionally
 * easy to find and adjust). Warnings remain visible read-only after
 * closure — a closed investigation's risk picture is still useful
 * historical context (§4.6 edge cases). Every warning restates, in
 * miniature, the risk-model disclaimer (product-spec §11.5): this is a
 * local advisory, not a regulatory risk determination.
 */
const HIGH_RISK_BANDS = ["High", "Critical"];
const IMMEDIATE_PRIORITY_OPEN_THRESHOLD_HOURS = 48;

export interface RiskWarning {
  message: string;
  href: string;
}

export interface RiskWarningsResult {
  label: string;
  /** product-spec §11.5's risk-model disclaimer, shown once alongside every warning — never a regulatory risk determination. */
  caption: string;
  warnings: RiskWarning[];
}

const RISK_MODEL_DISCLAIMER = "A local, rule-based advisory — not a regulatory risk determination.";

function href(investigationId: number, section: string): string {
  return `/investigations/${investigationId}/${section}`;
}

export async function getRiskWarnings(investigationId: number, now: Date = new Date()): Promise<RiskWarningsResult> {
  const investigation = await db.investigation.findUnique({
    where: { id: investigationId },
    include: {
      occurrence: true,
      hazards: { include: { _count: { select: { preventiveActions: true } } } },
      historyEntries: { where: { toStatus: InvestigationStatus.Open }, orderBy: { occurredAt: "desc" }, take: 1 },
    },
  });

  const label = SUPPORT_LABELS.riskWarning;
  if (!investigation) return { label, caption: RISK_MODEL_DISCLAIMER, warnings: [] };

  const warnings: RiskWarning[] = [];
  const stageIndex = STAGE_ORDER.indexOf(investigation.status);
  const analysisOrLater = stageIndex >= STAGE_ORDER.indexOf(InvestigationStatus.Analysis);

  for (const hazard of investigation.hazards) {
    // Rule 1: High/Critical residual risk with no linked Preventive Action.
    if (hazard.residualRiskBand && HIGH_RISK_BANDS.includes(hazard.residualRiskBand) && hazard._count.preventiveActions === 0) {
      warnings.push({
        message: `Hazard "${hazard.description.slice(0, 60)}" carries a ${hazard.residualRiskBand} residual risk band with no linked Preventive Action.`,
        href: href(investigationId, "hazards"),
      });
    }
    // Rule 3: Initial Risk recorded but no Residual assessment, once in Analysis or later.
    if (analysisOrLater && !hazard.residualRiskBand) {
      warnings.push({
        message: `Hazard "${hazard.description.slice(0, 60)}" has an Initial Risk assessment but no Residual Risk assessment yet, though the investigation has reached Analysis.`,
        href: href(investigationId, "hazards"),
      });
    }
  }

  // Rule 2: Immediate priority, still Open past the threshold.
  if (investigation.status === InvestigationStatus.Open && investigation.occurrence?.investigationPriority === "Immediate") {
    const enteredOpenAt = investigation.historyEntries[0]?.occurredAt ?? investigation.createdAt;
    const hoursInOpen = (now.getTime() - enteredOpenAt.getTime()) / (1000 * 60 * 60);
    if (hoursInOpen >= IMMEDIATE_PRIORITY_OPEN_THRESHOLD_HOURS) {
      warnings.push({
        message: `This Immediate-priority investigation has remained Open for over ${IMMEDIATE_PRIORITY_OPEN_THRESHOLD_HOURS} hours without progressing.`,
        href: href(investigationId, "occurrence"),
      });
    }
  }

  return { label, caption: RISK_MODEL_DISCLAIMER, warnings };
}

const STAGE_ORDER: InvestigationStatus[] = [
  InvestigationStatus.Draft,
  InvestigationStatus.Open,
  InvestigationStatus.UnderInvestigation,
  InvestigationStatus.Analysis,
  InvestigationStatus.Review,
  InvestigationStatus.Closed,
];
