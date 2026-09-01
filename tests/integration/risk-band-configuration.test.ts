import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/**
 * Mutates the shared RiskBandConfiguration table (delete-all-and-recreate,
 * per saveRiskBandsAction's own atomicity strategy), which every other
 * integration test relying on resolveRiskBand's seeded defaults also
 * depends on — snapshot-and-restore around every test here so this file
 * never leaves the table in a state that breaks hazard.test.ts or
 * risk-band.test.ts, regardless of run order.
 */
describe.skipIf(!process.env.DATABASE_URL)("Risk Band Configuration (FR-069)", () => {
  let snapshot: Awaited<ReturnType<typeof db.riskBandConfiguration.findMany>>;

  beforeAll(async () => {
    snapshot = await db.riskBandConfiguration.findMany();
  });

  afterEach(async () => {
    await db.riskBandConfiguration.deleteMany({});
    await db.riskBandConfiguration.createMany({
      data: snapshot.map((row) => ({
        minScore: row.minScore,
        maxScore: row.maxScore,
        bandLabel: row.bandLabel,
        colorHint: row.colorHint,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      })),
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function mockUser(role: UserRole, email: string) {
    const { auth } = await import("@/lib/auth");
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(user.id), role } } as never);
  }

  const VALID_SET = [
    { minScore: 1, maxScore: 5, bandLabel: "Low", colorHint: "green", displayOrder: 0, isActive: true },
    { minScore: 6, maxScore: 25, bandLabel: "High", colorHint: "red", displayOrder: 1, isActive: true },
  ];

  it("an Administrator can save a valid, full-coverage band set (positive)", async () => {
    await mockUser(UserRole.Administrator, "a.whitfield@investigations.example");
    const { saveRiskBandsAction } = await import("@/lib/actions/riskBandConfiguration");

    const formData = new FormData();
    formData.set("bandsJson", JSON.stringify(VALID_SET));
    const result = await saveRiskBandsAction({ error: null }, formData);
    expect(result.error).toBeNull();

    const rows = await db.riskBandConfiguration.findMany({ orderBy: { minScore: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0].bandLabel).toBe("Low");
    expect(rows[1].bandLabel).toBe("High");
  });

  it("a non-Administrator cannot save band changes (negative, server-side enforced)", async () => {
    await mockUser(UserRole.Investigator, "r.okafor@investigations.example");
    const { saveRiskBandsAction } = await import("@/lib/actions/riskBandConfiguration");

    const before = await db.riskBandConfiguration.findMany();
    const formData = new FormData();
    formData.set("bandsJson", JSON.stringify(VALID_SET));
    const result = await saveRiskBandsAction({ error: null }, formData);

    expect(result.error).not.toBeNull();
    const after = await db.riskBandConfiguration.findMany();
    expect(after).toEqual(before);
  });

  it("rejects a band set with a gap and saves nothing (atomicity)", async () => {
    await mockUser(UserRole.Administrator, "a.whitfield@investigations.example");
    const { saveRiskBandsAction } = await import("@/lib/actions/riskBandConfiguration");

    const before = await db.riskBandConfiguration.findMany();
    const withGap = [
      { minScore: 1, maxScore: 4, bandLabel: "Low", displayOrder: 0, isActive: true },
      { minScore: 10, maxScore: 25, bandLabel: "High", displayOrder: 1, isActive: true },
    ];
    const formData = new FormData();
    formData.set("bandsJson", JSON.stringify(withGap));
    const result = await saveRiskBandsAction({ error: null }, formData);

    expect(result.error).toMatch(/Gap/);
    const after = await db.riskBandConfiguration.findMany();
    expect(after).toHaveLength(before.length);
  });

  it("rejects a band set with an overlap and saves nothing (atomicity)", async () => {
    await mockUser(UserRole.Administrator, "a.whitfield@investigations.example");
    const { saveRiskBandsAction } = await import("@/lib/actions/riskBandConfiguration");

    const before = await db.riskBandConfiguration.findMany();
    const withOverlap = [
      { minScore: 1, maxScore: 15, bandLabel: "Low", displayOrder: 0, isActive: true },
      { minScore: 10, maxScore: 25, bandLabel: "High", displayOrder: 1, isActive: true },
    ];
    const formData = new FormData();
    formData.set("bandsJson", JSON.stringify(withOverlap));
    const result = await saveRiskBandsAction({ error: null }, formData);

    expect(result.error).toMatch(/Overlap/);
    const after = await db.riskBandConfiguration.findMany();
    expect(after).toHaveLength(before.length);
  });

  it("rejects duplicate Band Labels among active rows", async () => {
    await mockUser(UserRole.Administrator, "a.whitfield@investigations.example");
    const { saveRiskBandsAction } = await import("@/lib/actions/riskBandConfiguration");

    const duplicateLabels = [
      { minScore: 1, maxScore: 12, bandLabel: "Same", displayOrder: 0, isActive: true },
      { minScore: 13, maxScore: 25, bandLabel: "Same", displayOrder: 1, isActive: true },
    ];
    const formData = new FormData();
    formData.set("bandsJson", JSON.stringify(duplicateLabels));
    const result = await saveRiskBandsAction({ error: null }, formData);
    expect(result.error).not.toBeNull();
  });

  it("reconfiguring bands does not retroactively change a previously-stored Hazard's band label (EC-27)", async () => {
    // Score the hazard against whatever bands are active right now (the
    // beforeAll snapshot's — the seeded defaults, per prisma/seed.ts).
    const { calculateRiskScore, resolveRiskBand } = await import("@/lib/services/riskEngine");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-EC27-risk-band-reconfigure",
        status: "Open",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
    const score = calculateRiskScore("Likely", "Major"); // 16
    const { bandLabel: originalBand } = await resolveRiskBand(score);
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "EC-27 fixture.",
        hazardCategory: "Technical",
        initialLikelihood: "Likely",
        initialSeverity: "Major",
        initialRiskScore: score,
        initialRiskBand: originalBand,
      },
    });

    // An Administrator now reconfigures the bands entirely (renaming every label).
    await mockUser(UserRole.Administrator, "a.whitfield@investigations.example");
    const { saveRiskBandsAction } = await import("@/lib/actions/riskBandConfiguration");
    const renamed = [
      { minScore: 1, maxScore: 12, bandLabel: "Renamed-Low", displayOrder: 0, isActive: true },
      { minScore: 13, maxScore: 25, bandLabel: "Renamed-High", displayOrder: 1, isActive: true },
    ];
    const formData = new FormData();
    formData.set("bandsJson", JSON.stringify(renamed));
    const result = await saveRiskBandsAction({ error: null }, formData);
    expect(result.error).toBeNull();

    // The hazard's stored label is untouched — denormalized, not a live join.
    const unchanged = await db.hazard.findUniqueOrThrow({ where: { id: hazard.id } });
    expect(unchanged.initialRiskBand).toBe(originalBand);
    expect(unchanged.initialRiskBand).not.toMatch(/^Renamed-/);

    await db.investigation.delete({ where: { id: investigation.id } });
  });
});
