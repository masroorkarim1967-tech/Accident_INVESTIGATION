import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)("Investigation Findings (FR-072/073/074)", () => {
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

  it("adds a finding with auto-assigned sequential findingNumber (positive)", async () => {
    const { saveFindingAction } = await import("@/lib/actions/finding");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-finding-add");

    for (const label of ["First", "Second"]) {
      const formData = new FormData();
      formData.set("findingType", "Cause");
      formData.set("description", `${label} finding description, long enough to pass validation.`);
      const result = await saveFindingAction(investigation.id, null, { error: null }, formData);
      expect(result.error).toBeNull();
    }

    const findings = await db.investigationFinding.findMany({
      where: { investigationId: investigation.id },
      orderBy: { findingNumber: "asc" },
    });
    expect(findings.map((f) => f.findingNumber)).toEqual([1, 2]);
  });

  it("rejects a description under 20 characters (negative)", async () => {
    const { saveFindingAction } = await import("@/lib/actions/finding");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-finding-short");

    const formData = new FormData();
    formData.set("findingType", "Cause");
    formData.set("description", "Too short");
    const result = await saveFindingAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
    expect(await db.investigationFinding.count({ where: { investigationId: investigation.id } })).toBe(0);
  });

  it("cites Hazards, Contributing Factors, and Root Causes belonging to the same investigation (positive)", async () => {
    const { saveFindingAction } = await import("@/lib/actions/finding");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-finding-citations");
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
    const factor = await db.contributingFactor.create({
      data: { investigationId: investigation.id, description: "A factor.", category: "Procedures" },
    });
    const rootCause = await db.rootCause.create({
      data: {
        investigationId: investigation.id,
        description: "A cause.",
        category: "Procedures",
        supportingEvidence: "Sufficient supporting evidence text here.",
        confidenceLevel: "Medium",
      },
    });

    const formData = new FormData();
    formData.set("findingType", "Cause");
    formData.set("description", "A finding citing all three analytical record types.");
    formData.set("hazardIds", String(hazard.id));
    formData.set("contributingFactorIds", String(factor.id));
    formData.set("rootCauseIds", String(rootCause.id));
    const result = await saveFindingAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const finding = await db.investigationFinding.findFirstOrThrow({ where: { investigationId: investigation.id } });
    const [hazardLinks, factorLinks, rootCauseLinks] = await Promise.all([
      db.findingHazardLink.findMany({ where: { findingId: finding.id } }),
      db.findingContributingFactorLink.findMany({ where: { findingId: finding.id } }),
      db.findingRootCauseLink.findMany({ where: { findingId: finding.id } }),
    ]);
    expect(hazardLinks).toHaveLength(1);
    expect(factorLinks).toHaveLength(1);
    expect(rootCauseLinks).toHaveLength(1);
  });

  it("rejects a citation belonging to a different investigation (negative, server-enforced)", async () => {
    const { saveFindingAction } = await import("@/lib/actions/finding");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-finding-foreign-citation");
    const otherInvestigation = await makeFixtureInvestigation("TEST-FIXTURE-finding-foreign-citation-other");
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
    formData.set("findingType", "Cause");
    formData.set("description", "Should be rejected due to a foreign citation.");
    formData.set("hazardIds", String(foreignHazard.id));
    const result = await saveFindingAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
  });

  it("renumbers remaining findings contiguously after removing one (FR-073)", async () => {
    const { saveFindingAction, removeFindingAction } = await import("@/lib/actions/finding");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-finding-renumber");

    for (const label of ["First", "Second", "Third"]) {
      const formData = new FormData();
      formData.set("findingType", "Other");
      formData.set("description", `${label} finding, long enough description to pass.`);
      await saveFindingAction(investigation.id, null, { error: null }, formData);
    }
    const created = await db.investigationFinding.findMany({
      where: { investigationId: investigation.id },
      orderBy: { findingNumber: "asc" },
    });

    const result = await removeFindingAction(investigation.id, created[0].id);
    expect(result.error).toBeNull();

    const remaining = await db.investigationFinding.findMany({
      where: { investigationId: investigation.id },
      orderBy: { findingNumber: "asc" },
    });
    expect(remaining).toHaveLength(2);
    expect(remaining.map((f) => f.findingNumber)).toEqual([1, 2]);
    expect(remaining.map((f) => f.id)).toEqual([created[1].id, created[2].id]);
  });

  it("removing a Finding does not delete the Hazard/Factor/RootCause it cited (FR-074 edge case)", async () => {
    const { saveFindingAction, removeFindingAction } = await import("@/lib/actions/finding");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-finding-remove-preserves-citation");
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
    formData.set("findingType", "Cause");
    formData.set("description", "A finding citing a hazard.");
    formData.set("hazardIds", String(hazard.id));
    await saveFindingAction(investigation.id, null, { error: null }, formData);
    const finding = await db.investigationFinding.findFirstOrThrow({ where: { investigationId: investigation.id } });

    await removeFindingAction(investigation.id, finding.id);
    expect(await db.hazard.findUnique({ where: { id: hazard.id } })).not.toBeNull();
  });

  it("cascade-deletes InvestigationFinding rows when the parent Investigation is deleted (TS-012-016)", async () => {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-finding-cascade");
    const finding = await db.investigationFinding.create({
      data: {
        investigationId: investigation.id,
        findingNumber: 1,
        findingType: "Other",
        description: "Cascade test finding, long enough.",
        createdByUserId: investigator.id,
      },
    });
    await db.investigation.delete({ where: { id: investigation.id } });
    expect(await db.investigationFinding.findUnique({ where: { id: finding.id } })).toBeNull();
  });
});
