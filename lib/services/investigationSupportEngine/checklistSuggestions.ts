import { db } from "@/lib/db";
import { InvestigationStatus } from "@/prisma/generated/prisma/client";
import {
  checkDraftToOpenGate,
  checkOpenToUnderInvestigationGate,
  checkUnderInvestigationToAnalysisGate,
  checkAnalysisToReviewGate,
} from "@/lib/services/stageTransition";
import { SUPPORT_LABELS } from "./labels";

/**
 * assistance-engine.md §4.1 — Investigation Checklist Suggestions.
 * Category A, Definite. An active, prioritized short list of next steps,
 * restating the same stage-transition gate criteria
 * (lib/services/stageTransition.ts, the single source of truth for gate
 * pass/fail) as imperative suggestions, plus a small number of
 * best-practice suggestions beyond the minimum gate. Gate-relevant
 * suggestions always sort above best-practice ones. Recomputed fresh on
 * every page load — never persisted (§3.3).
 */
export interface ChecklistSuggestion {
  message: string;
  href: string;
}

export interface ChecklistSuggestionsResult {
  label: string;
  suggestions: ChecklistSuggestion[];
}

const MAX_SUGGESTIONS = 5;

function href(investigationId: number, section: string): string {
  return `/investigations/${investigationId}/${section}`;
}

export async function getChecklistSuggestions(investigationId: number): Promise<ChecklistSuggestionsResult> {
  const investigation = await db.investigation.findUnique({
    where: { id: investigationId },
    select: { status: true },
  });

  const label = SUPPORT_LABELS.checklistSuggestion;
  if (!investigation) return { label, suggestions: [] };

  const gateSuggestions: ChecklistSuggestion[] = [];

  switch (investigation.status) {
    case InvestigationStatus.Draft: {
      const gate = await checkDraftToOpenGate(investigationId);
      for (const item of gate.unmetItems) {
        gateSuggestions.push({ message: item, href: href(investigationId, "occurrence") });
      }
      break;
    }
    case InvestigationStatus.Open: {
      const gate = await checkOpenToUnderInvestigationGate(investigationId);
      for (const item of gate.unmetItems) {
        gateSuggestions.push({ message: item, href: href(investigationId, "occurrence") });
      }
      break;
    }
    case InvestigationStatus.UnderInvestigation: {
      const gate = await checkUnderInvestigationToAnalysisGate(investigationId);
      for (const item of gate.unmetItems) {
        gateSuggestions.push({ message: item, href: hrefForUnderInvestigationItem(investigationId, item) });
      }
      break;
    }
    case InvestigationStatus.Analysis: {
      const gate = await checkAnalysisToReviewGate(investigationId);
      for (const item of gate.unmetItems) {
        gateSuggestions.push({ message: item, href: hrefForAnalysisItem(investigationId, item) });
      }
      const bestPractice = await bestPracticeSuggestionsForAnalysis(investigationId);
      gateSuggestions.push(...bestPractice);
      break;
    }
    default:
      // Review, Closed: no gate is investigator-actionable in these
      // statuses (Review advances only by Reviewer decision; Closed is
      // terminal until Reopened) — no suggestions is the correct,
      // expected outcome (assistance-engine.md §3.7).
      break;
  }

  return { label, suggestions: gateSuggestions.slice(0, MAX_SUGGESTIONS) };
}

function hrefForUnderInvestigationItem(investigationId: number, item: string): string {
  if (item.startsWith("Aircraft") || item.startsWith("Flight")) return href(investigationId, "aircraft-flight");
  if (item.startsWith("Location")) return href(investigationId, "aircraft-flight");
  if (item.startsWith("Persons")) return href(investigationId, "occurrence");
  if (item.startsWith("Evidence")) return href(investigationId, "evidence");
  if (item.startsWith("Witnesses")) return href(investigationId, "witnesses");
  return href(investigationId, "occurrence");
}

function hrefForAnalysisItem(investigationId: number, item: string): string {
  if (item.includes("Hazard") || item.includes("Contributing Factor")) return href(investigationId, "hazards");
  if (item.includes("Root Cause")) return href(investigationId, "root-causes");
  if (item.includes("Action")) return href(investigationId, "actions");
  return href(investigationId, "occurrence");
}

/** Best-practice suggestions beyond the minimum Analysis -> Review gate. */
async function bestPracticeSuggestionsForAnalysis(investigationId: number): Promise<ChecklistSuggestion[]> {
  const suggestions: ChecklistSuggestion[] = [];

  const rootCausesMissingNotes = await db.rootCause.count({
    where: { investigationId, isInconclusive: false, investigatorNotes: null },
  });
  if (rootCausesMissingNotes > 0) {
    suggestions.push({
      message: "Consider adding Investigator Notes to strengthen this Potential Root Cause's traceability.",
      href: href(investigationId, "root-causes"),
    });
  }

  const findingCount = await db.investigationFinding.count({ where: { investigationId } });
  if (findingCount === 0) {
    suggestions.push({
      message: "Consider authoring an Investigation Finding summarizing this investigation's conclusions before submitting for review.",
      href: href(investigationId, "findings"),
    });
  }

  return suggestions;
}
