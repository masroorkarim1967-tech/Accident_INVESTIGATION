/**
 * Investigation Support Engine — single entry point for every capability
 * defined in assistance-engine.md (implementation-plan.md Phase 11). Re-
 * exports each capability module so callers can import from one place
 * rather than reaching into individual files, and provides
 * getInvestigationSupportSummary() for pages/panels that want every
 * Category A (Advisory) result in one call.
 */
export { SUPPORT_LABELS } from "./labels";
export type { ConfidenceTier } from "./confidence";

export { getChecklistSuggestions } from "./checklistSuggestions";
export type { ChecklistSuggestion, ChecklistSuggestionsResult } from "./checklistSuggestions";

export { getMissingInformationWarnings } from "./missingInfoWarnings";
export type { MissingInfoWarning, MissingInfoWarningsResult } from "./missingInfoWarnings";

export { getCompletenessScore } from "./completenessScore";
export type { CompletenessScoreResult, SectionScore } from "./completenessScore";

export { getRiskWarnings } from "./riskWarnings";
export type { RiskWarning, RiskWarningsResult } from "./riskWarnings";

export { getActionReminders } from "./actionReminders";
export type { ActionReminder, ActionRemindersResult } from "./actionReminders";

export { getReportQualityChecks } from "./reportQualityChecks";
export type { ReportQualityIssue, ReportQualityChecksResult } from "./reportQualityChecks";

export { suggestClassification } from "./suggestClassification";
export type { ClassificationSuggestion } from "./suggestClassification";

export { suggestContributingFactors } from "./suggestContributingFactor";
export type { ClosedInvestigationCandidate, ContributingFactorSuggestion } from "./suggestContributingFactor";

export { suggestFollowUpQuestion } from "./suggestFollowUpQuestion";
export type { FollowUpSuggestion } from "./suggestFollowUpQuestion";

import { getChecklistSuggestions, type ChecklistSuggestionsResult } from "./checklistSuggestions";
import { getMissingInformationWarnings, type MissingInfoWarningsResult } from "./missingInfoWarnings";
import { getCompletenessScore, type CompletenessScoreResult } from "./completenessScore";
import { getRiskWarnings, type RiskWarningsResult } from "./riskWarnings";
import { getActionReminders, type ActionRemindersResult } from "./actionReminders";
import { getReportQualityChecks, type ReportQualityChecksResult } from "./reportQualityChecks";

export interface InvestigationSupportSummary {
  checklist: ChecklistSuggestionsResult;
  missingInfo: MissingInfoWarningsResult;
  completeness: CompletenessScoreResult;
  riskWarnings: RiskWarningsResult;
  actionReminders: ActionRemindersResult;
  reportQuality: ReportQualityChecksResult;
}

/** Every Category A (Advisory) result for one investigation, in one call. */
export async function getInvestigationSupportSummary(investigationId: number): Promise<InvestigationSupportSummary> {
  const [checklist, missingInfo, completeness, riskWarnings, actionReminders, reportQuality] = await Promise.all([
    getChecklistSuggestions(investigationId),
    getMissingInformationWarnings(investigationId),
    getCompletenessScore(investigationId),
    getRiskWarnings(investigationId),
    getActionReminders(investigationId),
    getReportQualityChecks(investigationId),
  ]);

  return { checklist, missingInfo, completeness, riskWarnings, actionReminders, reportQuality };
}
