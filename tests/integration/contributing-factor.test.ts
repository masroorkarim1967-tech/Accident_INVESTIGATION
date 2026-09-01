import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)("Contributing Factors (FR-031/FR-032/FR-033)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-" } } });
    await db.$disconnect();
  });

  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(investigator.id), role: UserRole.Investigator } } as never);
  });

  async function makeFixtureInvestigation(title: string, narrativeDescription?: string) {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    return db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status: "Open",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15"), narrativeDescription } },
      },
    });
  }

  it("adds a contributing factor with no hazard links (positive)", async () => {
    const { saveContributingFactorAction } = await import("@/lib/actions/contributingFactor");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-cf-add");

    const formData = new FormData();
    formData.set("description", "Checklist step was not followed under time pressure.");
    formData.set("category", "Procedures");

    const result = await saveContributingFactorAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const factors = await db.contributingFactor.findMany({ where: { investigationId: investigation.id } });
    expect(factors).toHaveLength(1);
    expect(factors[0].category).toBe("Procedures");
  });

  it("links a contributing factor to hazards belonging to the same investigation (positive)", async () => {
    const { saveContributingFactorAction } = await import("@/lib/actions/contributingFactor");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-cf-hazard-link");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "A hazard.",
        hazardCategory: "Technical",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });

    const formData = new FormData();
    formData.set("description", "Linked factor.");
    formData.set("category", "Equipment");
    formData.set("hazardIds", String(hazard.id));

    const result = await saveContributingFactorAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const links = await db.contributingFactorHazardLink.findMany({ where: { hazardId: hazard.id } });
    expect(links).toHaveLength(1);
  });

  it("rejects a hazardId that belongs to a different investigation (negative, server-enforced)", async () => {
    const { saveContributingFactorAction } = await import("@/lib/actions/contributingFactor");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-cf-hazard-foreign");
    const otherInvestigation = await makeFixtureInvestigation("TEST-FIXTURE-cf-hazard-foreign-other");
    const foreignHazard = await db.hazard.create({
      data: {
        investigationId: otherInvestigation.id,
        description: "A hazard on another investigation.",
        hazardCategory: "Technical",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });

    const formData = new FormData();
    formData.set("description", "Should be rejected.");
    formData.set("category", "Equipment");
    formData.set("hazardIds", String(foreignHazard.id));

    const result = await saveContributingFactorAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
    expect(await db.contributingFactor.count({ where: { investigationId: investigation.id } })).toBe(0);
  });

  it("removes a contributing factor, clearing its hazard links but not the hazard itself (FR-032)", async () => {
    const { saveContributingFactorAction, removeContributingFactorAction } = await import("@/lib/actions/contributingFactor");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-cf-remove");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "A hazard.",
        hazardCategory: "Technical",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });
    const formData = new FormData();
    formData.set("description", "To remove.");
    formData.set("category", "Equipment");
    formData.set("hazardIds", String(hazard.id));
    await saveContributingFactorAction(investigation.id, null, { error: null }, formData);
    const factor = await db.contributingFactor.findFirstOrThrow({ where: { investigationId: investigation.id } });

    const result = await removeContributingFactorAction(investigation.id, factor.id);
    expect(result.error).toBeNull();
    expect(await db.contributingFactor.findUnique({ where: { id: factor.id } })).toBeNull();
    expect(await db.hazard.findUnique({ where: { id: hazard.id } })).not.toBeNull();
  });

  it("cascade-deletes ContributingFactor rows when the parent Investigation is deleted (TS-012-016)", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-cf-cascade");
    const factor = await db.contributingFactor.create({
      data: { investigationId: investigation.id, description: "Cascade test.", category: "ExternalFactors" },
    });
    await db.investigation.delete({ where: { id: investigation.id } });
    expect(await db.contributingFactor.findUnique({ where: { id: factor.id } })).toBeNull();
  });

  it("generateContributingFactorSuggestionsAction requires a Narrative Description first (FR-033)", async () => {
    const { generateContributingFactorSuggestionsAction } = await import("@/lib/actions/contributingFactor");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-cf-suggest-no-narrative");

    const result = await generateContributingFactorSuggestionsAction(investigation.id);
    expect(result.error).not.toBeNull();
    expect(result.suggestions).toEqual([]);
  });

  it("generateContributingFactorSuggestionsAction draws suggestions from closed investigations, tagged with source (FR-033)", async () => {
    const { generateContributingFactorSuggestionsAction } = await import("@/lib/actions/contributingFactor");
    const narrative = "Heavy rain landing resulted in a runway excursion with degraded braking action.";
    const closedSource = await makeFixtureInvestigation("TEST-FIXTURE-cf-suggest-closed-source", narrative);
    await db.investigation.update({ where: { id: closedSource.id }, data: { status: "Closed" } });
    await db.contributingFactor.create({
      data: { investigationId: closedSource.id, description: "Runway grooving overdue.", category: "Equipment" },
    });

    const current = await makeFixtureInvestigation("TEST-FIXTURE-cf-suggest-current", narrative);
    const result = await generateContributingFactorSuggestionsAction(current.id);
    expect(result.error).toBeNull();
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].sourceReferenceNumber).toBe(closedSource.referenceNumber);
  });
});
