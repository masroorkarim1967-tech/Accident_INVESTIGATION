import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)("Root Cause Analysis (FR-038/FR-039)", () => {
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

  it("adds a complete Root Cause (FR-038 positive)", async () => {
    const { saveRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-add");

    const formData = new FormData();
    formData.set("isInconclusive", "false");
    formData.set("description", "Checklist step was skipped under time pressure.");
    formData.set("category", "Procedures");
    formData.set("supportingEvidence", "Maintenance log entry #4 confirms the step was not signed off.");
    formData.set("confidenceLevel", "High");

    const result = await saveRootCauseAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const rootCauses = await db.rootCause.findMany({ where: { investigationId: investigation.id } });
    expect(rootCauses).toHaveLength(1);
    expect(rootCauses[0].isInconclusive).toBe(false);
  });

  it("rejects a save missing Supporting Evidence and Confidence Level (negative)", async () => {
    const { saveRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-missing-fields");

    const formData = new FormData();
    formData.set("isInconclusive", "false");
    formData.set("description", "A cause.");
    formData.set("category", "Procedures");

    const result = await saveRootCauseAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
    expect(result.fieldErrors?.supportingEvidence).toBeDefined();
    expect(result.fieldErrors?.confidenceLevel).toBeDefined();
    expect(await db.rootCause.count({ where: { investigationId: investigation.id } })).toBe(0);
  });

  it("accepts the inconclusive override with none of the four normal fields (positive, investigation-workflow.md §9.5)", async () => {
    const { saveRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-inconclusive");

    const formData = new FormData();
    formData.set("isInconclusive", "true");
    formData.set("inconclusiveJustification", "Available evidence was insufficient to pinpoint a definitive cause.");

    const result = await saveRootCauseAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const rootCause = await db.rootCause.findFirstOrThrow({ where: { investigationId: investigation.id } });
    expect(rootCause.isInconclusive).toBe(true);
    expect(rootCause.description).toBeNull();
    expect(rootCause.confidenceLevel).toBeNull();
  });

  it("rejects the inconclusive override with a justification under 20 characters (negative)", async () => {
    const { saveRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-inconclusive-short");

    const formData = new FormData();
    formData.set("isInconclusive", "true");
    formData.set("inconclusiveJustification", "Too short");

    const result = await saveRootCauseAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
    expect(await db.rootCause.count({ where: { investigationId: investigation.id } })).toBe(0);
  });

  it("links a Root Cause to a 5 Whys analysis and Contributing Factors belonging to the same investigation (positive)", async () => {
    const { saveRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-links");
    const analysis = await db.fiveWhysAnalysis.create({
      data: { investigationId: investigation.id, problemStatement: "The aircraft departed the runway.", createdByUserId: investigator.id },
    });
    const factor = await db.contributingFactor.create({
      data: { investigationId: investigation.id, description: "A factor.", category: "Procedures" },
    });

    const formData = new FormData();
    formData.set("isInconclusive", "false");
    formData.set("description", "A cause.");
    formData.set("category", "Procedures");
    formData.set("supportingEvidence", "Sufficient supporting evidence text here.");
    formData.set("confidenceLevel", "Medium");
    formData.set("fiveWhysAnalysisId", String(analysis.id));
    formData.set("contributingFactorIds", String(factor.id));

    const result = await saveRootCauseAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const rootCause = await db.rootCause.findFirstOrThrow({ where: { investigationId: investigation.id } });
    expect(rootCause.fiveWhysAnalysisId).toBe(analysis.id);
    const links = await db.rootCauseContributingFactorLink.findMany({ where: { rootCauseId: rootCause.id } });
    expect(links).toHaveLength(1);
  });

  it("rejects concluding a 5 Whys analysis already concluded by another Root Cause (data-model.md §3.17 unique constraint)", async () => {
    const { saveRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-double-conclude");
    const analysis = await db.fiveWhysAnalysis.create({
      data: { investigationId: investigation.id, problemStatement: "The aircraft departed the runway.", createdByUserId: investigator.id },
    });
    await db.rootCause.create({
      data: {
        investigationId: investigation.id,
        description: "First cause.",
        category: "Procedures",
        supportingEvidence: "Some supporting evidence text here.",
        confidenceLevel: "Low",
        fiveWhysAnalysisId: analysis.id,
      },
    });

    const formData = new FormData();
    formData.set("isInconclusive", "false");
    formData.set("description", "Second cause.");
    formData.set("category", "Equipment");
    formData.set("supportingEvidence", "Different supporting evidence text.");
    formData.set("confidenceLevel", "High");
    formData.set("fiveWhysAnalysisId", String(analysis.id));

    const result = await saveRootCauseAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toMatch(/already concluded/);
  });

  it("rejects a fiveWhysAnalysisId belonging to a different investigation (negative, server-enforced)", async () => {
    const { saveRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-foreign-analysis");
    const otherInvestigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-foreign-analysis-other");
    const foreignAnalysis = await db.fiveWhysAnalysis.create({
      data: { investigationId: otherInvestigation.id, problemStatement: "A different problem statement.", createdByUserId: investigator.id },
    });

    const formData = new FormData();
    formData.set("isInconclusive", "false");
    formData.set("description", "A cause.");
    formData.set("category", "Procedures");
    formData.set("supportingEvidence", "Sufficient supporting evidence text here.");
    formData.set("confidenceLevel", "Medium");
    formData.set("fiveWhysAnalysisId", String(foreignAnalysis.id));

    const result = await saveRootCauseAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
  });

  it("removes a Root Cause, leaving its linked 5 Whys analysis intact and re-eligible (FR-039)", async () => {
    const { saveRootCauseAction, removeRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-remove");
    const analysis = await db.fiveWhysAnalysis.create({
      data: { investigationId: investigation.id, problemStatement: "The aircraft departed the runway.", createdByUserId: investigator.id },
    });
    const formData = new FormData();
    formData.set("isInconclusive", "false");
    formData.set("description", "A cause.");
    formData.set("category", "Procedures");
    formData.set("supportingEvidence", "Sufficient supporting evidence text here.");
    formData.set("confidenceLevel", "Medium");
    formData.set("fiveWhysAnalysisId", String(analysis.id));
    await saveRootCauseAction(investigation.id, null, { error: null }, formData);
    const rootCause = await db.rootCause.findFirstOrThrow({ where: { investigationId: investigation.id } });

    const result = await removeRootCauseAction(investigation.id, rootCause.id);
    expect(result.error).toBeNull();
    expect(await db.rootCause.findUnique({ where: { id: rootCause.id } })).toBeNull();
    expect(await db.fiveWhysAnalysis.findUnique({ where: { id: analysis.id } })).not.toBeNull();
  });

  it("supports multiple Root Causes per investigation (EC-12)", async () => {
    const { saveRootCauseAction } = await import("@/lib/actions/rootCause");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-multiple");

    for (const label of ["A", "B"]) {
      const formData = new FormData();
      formData.set("isInconclusive", "false");
      formData.set("description", `Cause ${label}.`);
      formData.set("category", "Procedures");
      formData.set("supportingEvidence", `Supporting evidence for cause ${label}.`);
      formData.set("confidenceLevel", "Low");
      const result = await saveRootCauseAction(investigation.id, null, { error: null }, formData);
      expect(result.error).toBeNull();
    }

    const rootCauses = await db.rootCause.findMany({ where: { investigationId: investigation.id } });
    expect(rootCauses).toHaveLength(2);
  });

  it("cascade-deletes RootCause rows when the parent Investigation is deleted (TS-012-016)", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-rc-cascade");
    const rootCause = await db.rootCause.create({
      data: {
        investigationId: investigation.id,
        description: "A cause.",
        category: "Procedures",
        supportingEvidence: "Sufficient supporting evidence text here.",
        confidenceLevel: "Low",
      },
    });
    await db.investigation.delete({ where: { id: investigation.id } });
    expect(await db.rootCause.findUnique({ where: { id: rootCause.id } })).toBeNull();
  });
});
