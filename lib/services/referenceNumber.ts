import { db } from "@/lib/db";

/**
 * Generates a collision-free, per-year sequential reference number
 * (`INC-YYYY-NNNN`, data-model.md §3.2's DM-16 addendum — closes
 * spec-review.md SR-013). Race-safe under concurrent creation, including
 * exactly at a year boundary, via a single atomic upsert: the row for a
 * new year is created by this same statement the first time it's needed,
 * not by a separate rollover step that could itself race.
 */
export async function generateReferenceNumber(now: Date = new Date()): Promise<string> {
  const year = now.getUTCFullYear();

  const rows = await db.$queryRaw<{ nextValue: number }[]>`
    INSERT INTO "ReferenceNumberSequence" ("year", "nextValue")
    VALUES (${year}, 1)
    ON CONFLICT ("year")
    DO UPDATE SET "nextValue" = "ReferenceNumberSequence"."nextValue" + 1
    RETURNING "nextValue"
  `;

  const sequence = rows[0].nextValue;
  const paddedSequence = String(sequence).padStart(4, "0");

  return `INC-${year}-${paddedSequence}`;
}
