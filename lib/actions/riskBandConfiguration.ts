"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/requireRole";
import { AuthorizationError } from "@/lib/errors";
import { riskBandSetSchema, findCoverageViolation, findDuplicateActiveLabel } from "@/lib/validation/riskBandConfiguration";
import { UserRole } from "@/prisma/generated/prisma/client";

export type RiskBandActionState = { error: string | null };

/**
 * FR-069 — Configure Risk Bands. The whole set is submitted as one JSON
 * payload (RiskBandEditor.tsx serializes its editable rows) rather than
 * indexed form fields, matching the "all rows save together or none do"
 * requirement: one parse, one integrity check, one transaction.
 *
 * `RiskBandConfiguration.id` is never referenced by a foreign key —
 * Hazard/Occurrence store the resolved band *label*, not a live join
 * (data-model.md §6.4) — so a delete-all-and-recreate transaction is safe
 * and is what makes "atomic" trivial to guarantee here.
 */
export async function saveRiskBandsAction(
  _prevState: RiskBandActionState,
  formData: FormData,
): Promise<RiskBandActionState> {
  try {
    await requireRole([UserRole.Administrator]);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  let rawRows: unknown;
  try {
    rawRows = JSON.parse(String(formData.get("bandsJson") ?? "[]"));
  } catch {
    return { error: "Malformed submission." };
  }

  const parsed = riskBandSetSchema.safeParse(rawRows);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  }

  const coverageViolation = findCoverageViolation(parsed.data);
  if (coverageViolation) {
    return { error: coverageViolation };
  }
  const duplicateLabel = findDuplicateActiveLabel(parsed.data);
  if (duplicateLabel) {
    return { error: duplicateLabel };
  }

  await db.$transaction([
    db.riskBandConfiguration.deleteMany({}),
    db.riskBandConfiguration.createMany({
      data: parsed.data.map((row) => ({
        minScore: row.minScore,
        maxScore: row.maxScore,
        bandLabel: row.bandLabel,
        colorHint: row.colorHint || null,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      })),
    }),
  ]);

  revalidatePath("/settings/risk-bands");
  return { error: null };
}
