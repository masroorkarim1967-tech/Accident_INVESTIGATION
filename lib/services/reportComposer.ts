import { db } from "@/lib/db";
import { visibilityFilter } from "@/lib/services/investigationQueries";
import { categoryFloorApplied as computeCategoryFloorApplied } from "@/lib/services/riskEngine";
import { HistoryEventType, UserRole } from "@/prisma/generated/prisma/client";

/**
 * report-spec.md — assembles the full data set behind the Investigation
 * Report (Phase 13, FR-056–FR-058). One big read over every entity built
 * in Phases 4–10; no report content is persisted separately (RPT-2 — the
 * report is always a live recompute).
 *
 * RPT-5: "Established Facts" (§5.8) and "Investigation Conclusion" (§5.17)
 * are system-composed recaps of already-recorded data, never free text —
 * that guarantee is implemented here (`composeEstablishedFacts`,
 * `composeInvestigationConclusion`), in the service layer, not the page,
 * so it can never drift into an independently-authored narrative field.
 */

const INJURY_LEVELS = ["None", "Minor", "Serious", "Fatal"] as const;

const INCLUDE = {
  createdBy: { select: { name: true } },
  assignedInvestigator: { select: { name: true } },
  occurrence: {
    include: {
      occurrenceSubcategory: { select: { subcategory: true } },
    },
  },
  aircraft: true,
  flight: true,
  location: true,
  persons: { orderBy: { id: "asc" as const } },
  immediateActions: { orderBy: { occurredAt: "asc" as const } },
  witnesses: { orderBy: { id: "asc" as const } },
  evidence: {
    orderBy: { id: "asc" as const },
    include: {
      // Explicit `select` (not `include: true`) so the query never pulls
      // `fileBytes` — RPT-3/FR-058: attachments are referenced by
      // name/path, never embedded as binary content in the report or the
      // JSON export.
      attachments: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileSizeBytes: true,
          storagePath: true,
          isSimulated: true,
          uploadedAt: true,
          uploadedBy: { select: { name: true } },
        },
      },
      findingLinks: { include: { finding: { select: { findingNumber: true } } } },
    },
  },
  hazards: { orderBy: { id: "asc" as const } },
  contributingFactors: {
    orderBy: { id: "asc" as const },
    include: { hazardLinks: { include: { hazard: { select: { id: true, description: true } } } } },
  },
  fiveWhysAnalyses: { orderBy: { createdAt: "asc" as const }, include: { entries: { orderBy: { sequenceNumber: "asc" as const } } } },
  rootCauses: {
    orderBy: { id: "asc" as const },
    include: {
      fiveWhysAnalysis: { select: { problemStatement: true } },
      contributingFactorLinks: { include: { contributingFactor: { select: { id: true, description: true } } } },
    },
  },
  correctiveActions: { orderBy: { id: "asc" as const }, include: { owner: { select: { name: true } }, rootCause: { select: { id: true, description: true } }, hazard: { select: { id: true, description: true } } } },
  preventiveActions: { orderBy: { id: "asc" as const }, include: { owner: { select: { name: true } }, rootCause: { select: { id: true, description: true } }, hazard: { select: { id: true, description: true } } } },
  findings: {
    orderBy: { findingNumber: "asc" as const },
    include: {
      hazardLinks: { include: { hazard: { select: { id: true, description: true } } } },
      contributingFactorLinks: { include: { contributingFactor: { select: { id: true, description: true } } } },
      rootCauseLinks: { include: { rootCause: { select: { id: true, description: true } } } },
      evidenceLinks: { include: { evidence: { select: { id: true, description: true } } } },
    },
  },
  reviews: { orderBy: { decidedAt: "asc" as const }, include: { reviewer: { select: { name: true } } } },
} as const;

export type ComposedInvestigation = NonNullable<Awaited<ReturnType<typeof fetchInvestigation>>>;

function fetchInvestigation(investigationId: number, currentUser: { id: number; role: UserRole }) {
  return db.investigation.findFirst({
    where: { AND: [{ id: investigationId }, visibilityFilter(currentUser)] },
    include: INCLUDE,
  });
}

export interface EstablishedFact {
  line: string;
}

export interface ConclusionResult {
  intro: string | null;
  lines: string[];
}

export interface ReportData {
  investigation: ComposedInvestigation;
  injurySummary: { level: string; count: number }[] | null;
  establishedFacts: EstablishedFact[];
  conclusion: ConclusionResult;
  history: Awaited<ReturnType<typeof fetchHistory>>;
  overrideCloseEvent: Awaited<ReturnType<typeof fetchHistory>>[number] | null;
  categoryFloorApplied: boolean;
}

function fetchHistory(investigationId: number) {
  return db.investigationHistory.findMany({
    where: { investigationId },
    include: { performedBy: { select: { name: true } }, relatedReview: { select: { reviewDecision: true, comments: true } } },
    orderBy: { occurredAt: "asc" },
  });
}

/**
 * report-spec.md §8/FR-056: ADMIN/MANAGER/INVESTIGATOR/REVIEWER always;
 * VIEWER only once the investigation is Closed — a stricter gate than the
 * general list-visibility rule (`visibilityFilter` above only excludes
 * Draft for Viewer).
 */
export function canViewReport(currentUser: { role: UserRole }, investigationStatus: string): boolean {
  if (currentUser.role !== UserRole.Viewer) return true;
  return investigationStatus === "Closed";
}

function composeInjurySummary(persons: { injuryLevel: string }[], noPersonsInvolvedConfirmed: boolean) {
  if (persons.length === 0 && !noPersonsInvolvedConfirmed) return null;
  if (persons.length === 0) return [];
  return INJURY_LEVELS.map((level) => ({ level, count: persons.filter((p) => p.injuryLevel === level).length }));
}

/** §5.8 — system-composed recap; a fact with no underlying data produces no line. */
function composeEstablishedFacts(investigation: ComposedInvestigation): EstablishedFact[] {
  const lines: EstablishedFact[] = [];
  const occ = investigation.occurrence;

  if (occ?.occurrenceDateUtc) {
    const dateStr = occ.occurrenceDateUtc.toISOString().slice(0, 10);
    lines.push({
      line: occ.occurrenceCategory
        ? `Occurrence recorded on ${dateStr}, classified as ${occ.occurrenceCategory}.`
        : `Occurrence recorded on ${dateStr}; not yet classified.`,
    });
  }
  if (investigation.aircraft) {
    lines.push({
      line: `Aircraft involved: ${investigation.aircraft.manufacturer} ${investigation.aircraft.model} (${investigation.aircraft.registration}), damage level ${investigation.aircraft.damageLevel}.`,
    });
  }
  const noPersons = occ?.noPersonsInvolvedConfirmed ?? false;
  if (investigation.persons.length > 0) {
    const counts = INJURY_LEVELS.map((level) => `${investigation.persons.filter((p) => p.injuryLevel === level).length} ${level}`).join(", ");
    lines.push({ line: `${investigation.persons.length} person(s) involved — injury breakdown: ${counts}.` });
  } else if (noPersons) {
    lines.push({ line: "No persons were involved in this occurrence." });
  }
  if (investigation.immediateActions.length > 0) {
    lines.push({ line: `${investigation.immediateActions.length} immediate action(s) taken at the time of occurrence.` });
  }
  if (investigation.evidence.length > 0) {
    lines.push({ line: `${investigation.evidence.length} item(s) of evidence reviewed.` });
  }
  return lines;
}

/** §5.17 — system-composed recap, never a free-typed narrative field (RPT-5). */
function composeInvestigationConclusion(investigation: ComposedInvestigation): ConclusionResult {
  if (investigation.findings.length > 0) {
    return {
      intro: "The investigation identified the following finding(s):",
      lines: investigation.findings.map((f) => `Finding ${f.findingNumber} (${f.findingType}): ${f.description}`),
    };
  }
  const conclusiveRootCauses = investigation.rootCauses.filter((rc) => !rc.isInconclusive && rc.description);
  if (conclusiveRootCauses.length > 0) {
    return {
      intro: "The investigation's assessment identified the following potential root cause(s):",
      lines: conclusiveRootCauses.map((rc) => `Potential Root Cause: ${rc.description}`),
    };
  }
  return { intro: null, lines: [] };
}

export async function composeReport(
  investigationId: number,
  currentUser: { id: number; role: UserRole },
): Promise<ReportData | null> {
  const investigation = await fetchInvestigation(investigationId, currentUser);
  if (!investigation) return null;

  const history = await fetchHistory(investigationId);
  const overrideCloseEvent = history.find((h) => h.eventType === HistoryEventType.Closed && h.reasonText) ?? null;

  const occ = investigation.occurrence;
  const categoryFloorApplied =
    occ?.severity && occ.riskBand ? computeCategoryFloorApplied(occ.severity, occ.riskBand, occ.occurrenceCategory) : false;

  return {
    investigation,
    injurySummary: composeInjurySummary(investigation.persons, occ?.noPersonsInvolvedConfirmed ?? false),
    establishedFacts: composeEstablishedFacts(investigation),
    conclusion: composeInvestigationConclusion(investigation),
    history,
    overrideCloseEvent,
    categoryFloorApplied,
  };
}
