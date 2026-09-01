import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";
import { calculateRiskScore, resolveRiskBand } from "@/lib/services/riskEngine";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// See tests/integration/witness.test.ts for why revalidatePath is mocked.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)("Hazard Analysis (FR-029/FR-030/FR-068)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-" } } });
    await db.$disconnect();
  });

  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(investigator.id), role: UserRole.Investigator } } as never);
  });

  async function makeFixtureInvestigation(title: string) {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    return db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status: "Open",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
  }

  it("adds a hazard with Initial Risk computed via the shared risk engine (positive, TS-027 style)", async () => {
    const { saveHazardAction } = await import("@/lib/actions/hazard");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-hazard-add");

    const formData = new FormData();
    formData.set("description", "Wet runway with degraded braking action.");
    formData.set("hazardCategory", "Environmental");
    formData.set("initialLikelihood", "Likely");
    formData.set("initialSeverity", "Major");

    const result = await saveHazardAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const hazards = await db.hazard.findMany({ where: { investigationId: investigation.id } });
    expect(hazards).toHaveLength(1);

    // TS-027-031: the Hazard module must produce identical results to
    // Occurrence's own use of the same shared riskEngine functions.
    const expectedScore = calculateRiskScore("Likely", "Major");
    const expectedBand = await resolveRiskBand(expectedScore);
    expect(hazards[0].initialRiskScore).toBe(expectedScore);
    expect(hazards[0].initialRiskBand).toBe(expectedBand.bandLabel);
  });

  it("rejects an empty description (negative)", async () => {
    const { saveHazardAction } = await import("@/lib/actions/hazard");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-hazard-empty-description");

    const formData = new FormData();
    formData.set("description", "");
    formData.set("hazardCategory", "Technical");
    formData.set("initialLikelihood", "Rare");
    formData.set("initialSeverity", "Negligible");

    const result = await saveHazardAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
    expect(await db.hazard.count({ where: { investigationId: investigation.id } })).toBe(0);
  });

  it("recomputes Initial Risk when Likelihood/Severity change on an existing hazard (FR-029 edge case)", async () => {
    const { saveHazardAction } = await import("@/lib/actions/hazard");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-hazard-recompute");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "Initial description.",
        hazardCategory: "Technical",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });

    const formData = new FormData();
    formData.set("description", "Updated description.");
    formData.set("hazardCategory", "Technical");
    formData.set("initialLikelihood", "AlmostCertain");
    formData.set("initialSeverity", "Catastrophic");

    const result = await saveHazardAction(investigation.id, hazard.id, { error: null }, formData);
    expect(result.error).toBeNull();

    const updated = await db.hazard.findUniqueOrThrow({ where: { id: hazard.id } });
    expect(updated.initialRiskScore).toBe(25);
    expect(updated.initialRiskBand).toBe("Critical");
  });

  it("saves Residual Risk independently of Initial Risk (FR-068 positive)", async () => {
    const { saveHazardResidualRiskAction } = await import("@/lib/actions/hazard");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-hazard-residual");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "A hazard.",
        hazardCategory: "Organizational",
        initialLikelihood: "Likely",
        initialSeverity: "Major",
        initialRiskScore: 16,
        initialRiskBand: "High",
      },
    });

    const formData = new FormData();
    formData.set("existingControls", "Additional runway inspections introduced.");
    formData.set("residualLikelihood", "Unlikely");
    formData.set("residualSeverity", "Minor");

    const result = await saveHazardResidualRiskAction(investigation.id, hazard.id, { error: null }, formData);
    expect(result.error).toBeNull();
    expect(result.warning).toBeFalsy();

    const updated = await db.hazard.findUniqueOrThrow({ where: { id: hazard.id } });
    expect(updated.residualRiskScore).toBe(calculateRiskScore("Unlikely", "Minor"));
    expect(updated.existingControls).toBe("Additional runway inspections introduced.");
  });

  it("returns a non-blocking warning (but still saves) when residual risk exceeds initial risk (FR-068 error behavior)", async () => {
    const { saveHazardResidualRiskAction } = await import("@/lib/actions/hazard");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-hazard-residual-warning");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "A hazard.",
        hazardCategory: "Organizational",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });

    const formData = new FormData();
    formData.set("existingControls", "A control later found ineffective.");
    formData.set("residualLikelihood", "AlmostCertain");
    formData.set("residualSeverity", "Catastrophic");

    const result = await saveHazardResidualRiskAction(investigation.id, hazard.id, { error: null }, formData);
    expect(result.error).toBeNull();
    expect(result.warning).toMatch(/higher than initial risk/);

    const updated = await db.hazard.findUniqueOrThrow({ where: { id: hazard.id } });
    expect(updated.residualRiskScore).toBe(25);
  });

  it("rejects residual likelihood set without residual severity (negative)", async () => {
    const { saveHazardResidualRiskAction } = await import("@/lib/actions/hazard");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-hazard-residual-partial");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "A hazard.",
        hazardCategory: "Other",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });

    const formData = new FormData();
    formData.set("existingControls", "");
    formData.set("residualLikelihood", "Possible");
    formData.set("residualSeverity", "");

    const result = await saveHazardResidualRiskAction(investigation.id, hazard.id, { error: null }, formData);
    expect(result.error).not.toBeNull();

    const unchanged = await db.hazard.findUniqueOrThrow({ where: { id: hazard.id } });
    expect(unchanged.residualRiskScore).toBeNull();
  });

  it("removes a hazard (FR-030)", async () => {
    const { removeHazardAction } = await import("@/lib/actions/hazard");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-hazard-remove");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "To remove.",
        hazardCategory: "Other",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });

    const result = await removeHazardAction(investigation.id, hazard.id);
    expect(result.error).toBeNull();
    expect(await db.hazard.findUnique({ where: { id: hazard.id } })).toBeNull();
  });

  it("cascade-deletes Hazard rows when the parent Investigation is deleted (TS-012-016)", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-hazard-cascade");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "Cascade test.",
        hazardCategory: "Other",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });

    await db.investigation.delete({ where: { id: investigation.id } });
    expect(await db.hazard.findUnique({ where: { id: hazard.id } })).toBeNull();
  });
});
