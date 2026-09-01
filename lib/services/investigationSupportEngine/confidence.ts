/**
 * assistance-engine.md §3.4 — not every output is the same kind of claim.
 *
 * Definite outputs (structural facts — a field is empty or it isn't) carry
 * no confidence tier at all; there is no uncertainty to express. Checklist
 * Suggestions, Missing-Information Warnings, Risk Warnings, Action
 * Reminders, and Report Quality Checks are all Definite, and their result
 * types simply omit a confidence field.
 *
 * Inferential outputs (text/keyword pattern-matching — Suggested
 * Classification, Potential Contributing Factor, Suggested Follow-up
 * Question) carry this three-tier scale, shown alongside the output, never
 * hidden. An Inferential capability that finds nothing above its minimum
 * threshold returns null/empty rather than forcing out a low-quality guess.
 */
export type ConfidenceTier = "Low" | "Medium" | "High";
