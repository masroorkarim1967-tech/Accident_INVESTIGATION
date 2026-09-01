import { db } from "@/lib/db";
import { InvestigationStatus } from "@/prisma/generated/prisma/client";
import { SUPPORT_LABELS } from "./labels";

/**
 * assistance-engine.md §4.4 — Investigation Completeness Score. Not
 * Definite, not Inferential — a precise coverage calculation (§3.4). Scored
 * only against fields relevant to the investigation's *current* stage
 * (cumulative through the gate the investigation has already reached), so
 * a Draft investigation is never penalized for lacking Root Cause data.
 * Gate-required fields are weighted higher (GATE_WEIGHT) than optional
 * best-practice fields (OPTIONAL_WEIGHT). Always paired with the fixed
 * "coverage, not quality" caption — never presented as a quality/
 * correctness measure.
 */
const GATE_WEIGHT = 3;
const OPTIONAL_WEIGHT = 1;

export interface SectionScore {
  section: string;
  populatedWeight: number;
  totalWeight: number;
}

export interface CompletenessScoreResult {
  label: string;
  percent: number;
  stageContextMessage: string;
  caption: string;
  sections: SectionScore[];
}

interface Check {
  section: string;
  weight: number;
  populated: boolean;
}

const STAGE_ORDER: InvestigationStatus[] = [
  InvestigationStatus.Draft,
  InvestigationStatus.Open,
  InvestigationStatus.UnderInvestigation,
  InvestigationStatus.Analysis,
  InvestigationStatus.Review,
  InvestigationStatus.Closed,
];

export async function getCompletenessScore(investigationId: number): Promise<CompletenessScoreResult> {
  const investigation = await db.investigation.findUnique({
    where: { id: investigationId },
    include: {
      occurrence: true,
      aircraft: true,
      flight: true,
      location: true,
      _count: { select: { persons: true, evidence: true, witnesses: true, hazards: true, contributingFactors: true, rootCauses: true, correctiveActions: true, preventiveActions: true } },
    },
  });

  const label = SUPPORT_LABELS.completenessScore;
  const caption = "Reflects data completeness only — not investigation quality or correctness.";
  if (!investigation) {
    return { label, percent: 0, stageContextMessage: "", caption, sections: [] };
  }

  const occ = investigation.occurrence;
  const stageIndex = STAGE_ORDER.indexOf(investigation.status);

  const checks: Check[] = [];

  // Draft -> Open fields — always in scope from Draft onward.
  checks.push(
    { section: "Occurrence Narrative", weight: GATE_WEIGHT, populated: Boolean(occ?.occurrenceDateUtc && occ?.occurrenceTimeUtc) },
    { section: "Occurrence Narrative", weight: GATE_WEIGHT, populated: Boolean(occ?.phaseOfFlight) },
    { section: "Occurrence Narrative", weight: GATE_WEIGHT, populated: Boolean(occ?.briefDescription) },
    { section: "Occurrence Narrative", weight: GATE_WEIGHT, populated: Boolean(occ?.narrativeDescription) },
    { section: "Investigator Assignment", weight: GATE_WEIGHT, populated: Boolean(investigation.assignedInvestigatorUserId) },
  );

  if (stageIndex >= STAGE_ORDER.indexOf(InvestigationStatus.Open)) {
    checks.push(
      { section: "Occurrence Classification", weight: GATE_WEIGHT, populated: Boolean(occ?.occurrenceCategory && occ?.occurrenceSubcategoryId) },
      { section: "Occurrence Outcome", weight: GATE_WEIGHT, populated: Boolean(occ?.actualOutcomeSeverity) },
      { section: "Occurrence Outcome", weight: GATE_WEIGHT, populated: Boolean(occ?.potentialOutcomeSeverity) },
      { section: "Occurrence Outcome", weight: GATE_WEIGHT, populated: Boolean(occ?.likelihoodOfRecurrence) },
    );
  }

  if (stageIndex >= STAGE_ORDER.indexOf(InvestigationStatus.UnderInvestigation)) {
    checks.push(
      { section: "Aircraft", weight: GATE_WEIGHT, populated: Boolean(investigation.aircraft) },
      { section: "Aircraft", weight: OPTIONAL_WEIGHT, populated: Boolean(investigation.aircraft?.serialNumber) },
      { section: "Flight", weight: GATE_WEIGHT, populated: Boolean(investigation.flight) },
      { section: "Flight", weight: OPTIONAL_WEIGHT, populated: Boolean(investigation.flight?.picLicenseNumber) },
      { section: "Location", weight: GATE_WEIGHT, populated: Boolean(investigation.location) },
      { section: "Location", weight: OPTIONAL_WEIGHT, populated: Boolean(investigation.location?.weatherVisibility) },
      { section: "Persons Involved", weight: GATE_WEIGHT, populated: Boolean(investigation._count.persons > 0 || occ?.noPersonsInvolvedConfirmed) },
      { section: "Evidence", weight: GATE_WEIGHT, populated: Boolean(investigation._count.evidence > 0 || occ?.noEvidenceAvailableConfirmed) },
      { section: "Witnesses", weight: GATE_WEIGHT, populated: Boolean(investigation._count.witnesses > 0 || occ?.noWitnessesConfirmed) },
    );
  }

  if (stageIndex >= STAGE_ORDER.indexOf(InvestigationStatus.Analysis)) {
    checks.push(
      { section: "Hazard / Contributing Factor Analysis", weight: GATE_WEIGHT, populated: Boolean(investigation._count.hazards > 0 || investigation._count.contributingFactors > 0) },
      { section: "Root Cause Analysis", weight: GATE_WEIGHT, populated: investigation._count.rootCauses > 0 },
      { section: "Corrective/Preventive Actions", weight: GATE_WEIGHT, populated: Boolean(investigation._count.correctiveActions > 0 || investigation._count.preventiveActions > 0) },
    );
  }

  const populatedWeight = checks.filter((c) => c.populated).reduce((sum, c) => sum + c.weight, 0);
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const percent = totalWeight === 0 ? 0 : Math.round((populatedWeight / totalWeight) * 100);

  const sectionsBySection = new Map<string, SectionScore>();
  for (const check of checks) {
    const existing = sectionsBySection.get(check.section) ?? { section: check.section, populatedWeight: 0, totalWeight: 0 };
    existing.totalWeight += check.weight;
    if (check.populated) existing.populatedWeight += check.weight;
    sectionsBySection.set(check.section, existing);
  }

  return {
    label,
    percent,
    stageContextMessage: `${percent}% complete — on track for the ${stageLabel(investigation.status)} stage.`,
    caption,
    sections: Array.from(sectionsBySection.values()),
  };
}

function stageLabel(status: InvestigationStatus): string {
  if (status === InvestigationStatus.UnderInvestigation) return "Under Investigation";
  return status;
}
