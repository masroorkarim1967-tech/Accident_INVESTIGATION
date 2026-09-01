import { z } from "zod";

/** FR-069 — one editable row of the risk-band matrix. `id` is absent for a newly-added row. */
export const riskBandRowSchema = z
  .object({
    id: z.number().int().positive().optional(),
    minScore: z.coerce.number().int().min(1, "Min Score must be at least 1.").max(25, "Min Score cannot exceed 25."),
    maxScore: z.coerce.number().int().min(1, "Max Score must be at least 1.").max(25, "Max Score cannot exceed 25."),
    bandLabel: z.string().trim().min(1, "Band Label is required.").max(20, "Band Label must be 20 characters or fewer."),
    colorHint: z.string().trim().max(20).optional().or(z.literal("")),
    displayOrder: z.coerce.number().int(),
    isActive: z.boolean(),
  })
  .refine((row) => row.minScore <= row.maxScore, {
    message: "Min Score must be less than or equal to Max Score.",
    path: ["minScore"],
  });

export type RiskBandRow = z.infer<typeof riskBandRowSchema>;

export const riskBandSetSchema = z.array(riskBandRowSchema).min(1, "At least one band is required.");

/**
 * data-model.md §6.4's integrity rule: active bands must collectively
 * cover 1-25 with no gaps and no overlaps. Returns the specific
 * conflicting range on violation (FR-069's error behavior requires
 * showing it, not just a generic rejection), or null when the set is valid.
 */
export function findCoverageViolation(rows: Pick<RiskBandRow, "minScore" | "maxScore" | "isActive">[]): string | null {
  const active = [...rows.filter((r) => r.isActive)].sort((a, b) => a.minScore - b.minScore);

  if (active.length === 0) {
    return "At least one active band is required.";
  }
  if (active[0].minScore !== 1) {
    return `Gap: no active band covers score 1-${active[0].minScore - 1}.`;
  }

  for (let i = 1; i < active.length; i++) {
    const prev = active[i - 1];
    const row = active[i];
    if (row.minScore <= prev.maxScore) {
      return `Overlap: ${prev.minScore}-${prev.maxScore} and ${row.minScore}-${row.maxScore} both cover score ${row.minScore}.`;
    }
    if (row.minScore > prev.maxScore + 1) {
      return `Gap: no active band covers score ${prev.maxScore + 1}-${row.minScore - 1}.`;
    }
  }

  const last = active[active.length - 1];
  if (last.maxScore !== 25) {
    return `Gap: no active band covers score ${last.maxScore + 1}-25.`;
  }

  return null;
}

/** Band Label must be unique among active rows (FR-069's validation rule). */
export function findDuplicateActiveLabel(rows: Pick<RiskBandRow, "bandLabel" | "isActive">[]): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.isActive) continue;
    if (seen.has(row.bandLabel)) {
      return `Band Label "${row.bandLabel}" is used by more than one active band.`;
    }
    seen.add(row.bandLabel);
  }
  return null;
}
