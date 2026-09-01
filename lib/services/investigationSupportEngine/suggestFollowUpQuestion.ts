/**
 * FR-036 — Generate Recommended Follow-up Question (Investigation
 * Support). Templated prompting (product-spec.md §6.2) — no external AI
 * service. A passive-voice previous answer ("the checklist step was
 * skipped") templates into a matching question ("Why was the checklist
 * step skipped?", High confidence); anything else falls back to a
 * generic question (Low confidence) rather than a nonsensical
 * auto-generated sentence (FR-036's Error Behavior).
 * Category B, Inferential (assistance-engine.md §3.3/§4.5). Moved here
 * unchanged from lib/services/suggestFollowUpQuestion.ts as part of
 * Phase 11's consolidation — externally observed behavior is identical to
 * the Phase 8 original.
 */

export interface FollowUpSuggestion {
  question: string;
  confidence: "High" | "Low";
}

const GENERIC_FALLBACK: FollowUpSuggestion = { question: "Why did this happen?", confidence: "Low" };
const MIN_ANSWER_LENGTH = 15;

export function suggestFollowUpQuestion(previousAnswer: string): FollowUpSuggestion {
  const trimmed = previousAnswer.trim();
  if (trimmed.length < MIN_ANSWER_LENGTH) {
    return GENERIC_FALLBACK;
  }

  const clause = trimmed.replace(/[.?!]+$/, "");
  const lowerFirst = clause.charAt(0).toLowerCase() + clause.slice(1);

  // Passive-voice pattern: "<subject> was/were <predicate>" -> "Why was/were <subject> <predicate>?"
  const passiveMatch = lowerFirst.match(/^(.+?)\s+(was|were)\s+(.+)$/i);
  if (passiveMatch) {
    const [, subject, verb, predicate] = passiveMatch;
    return { question: `Why ${verb} ${subject} ${predicate}?`, confidence: "High" };
  }

  return { question: `Why did ${lowerFirst}?`, confidence: "Low" };
}
