/**
 * assistance-engine.md §3.3 — the exact umbrella + sub-label pair for every
 * Investigation Support output. Centralized so no capability can drift from
 * the mandated wording; never paraphrase these at the call site.
 */
export const SUPPORT_LABELS = {
  checklistSuggestion: "Investigation Support · Suggested Next Step",
  missingInformationWarning: "Investigation Support · Missing Information",
  contributingFactorSuggestion: "Investigation Support · Potential Contributing Factor",
  completenessScore: "Investigation Support · Completeness Score",
  followUpQuestion: "Investigation Support · Recommended Follow-up",
  riskWarning: "Investigation Support · Risk Warning",
  actionReminder: "Investigation Support · Action Reminder",
  reportQualityCheck: "Investigation Support · Report Quality Check",
  suggestedClassification: "Investigation Support · Suggested Classification",
} as const;
