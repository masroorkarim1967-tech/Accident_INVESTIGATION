import { describe, expect, it, afterAll } from "vitest";
import { db } from "@/lib/db";
import { resolveRiskBand } from "@/lib/services/riskEngine";

/**
 * Requires a live database seeded with the default RiskBandConfiguration
 * rows (prisma/seed.ts) — skipped, not deleted, without one (same pattern
 * as every other integration test in this project).
 */
describe.skipIf(!process.env.DATABASE_URL)("resolveRiskBand against seeded bands (data-model.md §6.4, TS-028)", () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it("score 4 resolves to Low (boundary, inclusive)", async () => {
    const result = await resolveRiskBand(4);
    expect(result.bandLabel).toBe("Low");
  });

  it("score 5 resolves to Moderate (boundary, inclusive — TS-028)", async () => {
    const result = await resolveRiskBand(5);
    expect(result.bandLabel).toBe("Moderate");
  });

  it("score 16 resolves to High", async () => {
    const result = await resolveRiskBand(16);
    expect(result.bandLabel).toBe("High");
  });

  it("score 17 resolves to Critical (boundary, inclusive)", async () => {
    const result = await resolveRiskBand(17);
    expect(result.bandLabel).toBe("Critical");
  });

  it("every score from 1-25 resolves to exactly one band (full-coverage integrity rule)", async () => {
    for (let score = 1; score <= 25; score++) {
      const result = await resolveRiskBand(score);
      expect(result.bandLabel).toBeTruthy();
    }
  });
});
