import type { FactorCategory } from "@/prisma/generated/prisma/client";
import type { ConfidenceTier } from "./confidence";

/**
 * FR-033 — Generate Potential Contributing Factors (Investigation Support).
 * Local, deterministic word-overlap similarity against closed
 * investigations' narratives (product-spec.md §6.2's "local text
 * similarity", assistance-engine.md §4.3's "keyword/TF-IDF-style
 * comparison") — no external AI service. Never auto-added; the caller
 * always routes an accepted suggestion through FR-031's normal save path.
 * Category B, Inferential (assistance-engine.md §3.3/§3.4). Moved here
 * from lib/services/suggestContributingFactor.ts as part of Phase 11's
 * consolidation — similarity scoring is identical to the Phase 8 original;
 * this pass adds the `confidence` tier bucketed from `similarityScore`,
 * closing the same §3.4 gap fixed for Suggested Classification (a raw
 * score alone is not the mandated Low/Medium/High label).
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "was", "were", "is", "are",
  "it", "its", "this", "that", "with", "for", "as", "by", "from", "had", "has", "have",
  "not", "be", "been", "which", "who", "when", "then", "than", "into", "onto", "during",
]);

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}

/** Jaccard similarity (intersection / union) between two normalized word sets. */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface ClosedInvestigationCandidate {
  referenceNumber: string;
  narrativeDescription: string;
  factors: { description: string; category: FactorCategory }[];
}

export interface ContributingFactorSuggestion {
  description: string;
  category: FactorCategory;
  sourceReferenceNumber: string;
  similarityScore: number;
  confidence: ConfidenceTier;
}

// assistance-engine.md §3.4's performance note: bounded scan, fixed caps.
const MAX_SOURCE_INVESTIGATIONS = 5;
const MAX_SUGGESTIONS = 10;
const MIN_SIMILARITY = 0.05;
const HIGH_SIMILARITY = 0.25;
const MEDIUM_SIMILARITY = 0.12;

function confidenceFor(score: number): ConfidenceTier {
  if (score >= HIGH_SIMILARITY) return "High";
  if (score >= MEDIUM_SIMILARITY) return "Medium";
  return "Low";
}

export function suggestContributingFactors(
  currentNarrative: string,
  candidates: ClosedInvestigationCandidate[],
): ContributingFactorSuggestion[] {
  const currentWords = wordSet(currentNarrative);

  const scored = candidates
    .map((candidate) => ({ candidate, score: jaccardSimilarity(currentWords, wordSet(candidate.narrativeDescription)) }))
    .filter((entry) => entry.score >= MIN_SIMILARITY && entry.candidate.factors.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCE_INVESTIGATIONS);

  const suggestions: ContributingFactorSuggestion[] = [];
  const seen = new Set<string>();

  for (const { candidate, score } of scored) {
    for (const factor of candidate.factors) {
      const key = `${factor.category}::${factor.description.toLowerCase().trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        description: factor.description,
        category: factor.category,
        sourceReferenceNumber: candidate.referenceNumber,
        similarityScore: score,
        confidence: confidenceFor(score),
      });
      if (suggestions.length >= MAX_SUGGESTIONS) return suggestions;
    }
  }

  return suggestions;
}
