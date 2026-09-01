import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)("5 Whys Analysis (FR-034/FR-035/FR-036/FR-037)", () => {
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

  it("starts a new analysis (FR-034 positive)", async () => {
    const { startFiveWhysAnalysisAction } = await import("@/lib/actions/fiveWhys");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-start");

    const formData = new FormData();
    formData.set("problemStatement", "The aircraft departed the runway centerline during landing.");
    const result = await startFiveWhysAnalysisAction(investigation.id, { error: null }, formData);
    expect(result.error).toBeNull();

    const analyses = await db.fiveWhysAnalysis.findMany({ where: { investigationId: investigation.id } });
    expect(analyses).toHaveLength(1);
  });

  it("rejects a problem statement under 10 characters (negative)", async () => {
    const { startFiveWhysAnalysisAction } = await import("@/lib/actions/fiveWhys");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-start-short");
    const formData = new FormData();
    formData.set("problemStatement", "Too short");
    const result = await startFiveWhysAnalysisAction(investigation.id, { error: null }, formData);
    expect(result.error).not.toBeNull();
  });

  async function makeAnalysis(investigationId: number) {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    return db.fiveWhysAnalysis.create({
      data: { investigationId, problemStatement: "The aircraft departed the runway centerline.", createdByUserId: investigator.id },
    });
  }

  it("appends Why entries in sequence order, auto-assigning sequenceNumber (FR-035 positive)", async () => {
    const { saveWhyEntryAction } = await import("@/lib/actions/fiveWhys");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-entry-append");
    const analysis = await makeAnalysis(investigation.id);

    for (let i = 1; i <= 3; i++) {
      const formData = new FormData();
      formData.set("question", `Why #${i}?`);
      formData.set("answer", `Because reason ${i}.`);
      const result = await saveWhyEntryAction(investigation.id, analysis.id, null, { error: null }, formData);
      expect(result.error).toBeNull();
    }

    const entries = await db.fiveWhysEntry.findMany({ where: { fiveWhysAnalysisId: analysis.id }, orderBy: { sequenceNumber: "asc" } });
    expect(entries.map((e) => e.sequenceNumber)).toEqual([1, 2, 3]);
  });

  it("blocks a 6th entry on a single analysis (FR-035 hard cap, data-model.md §3.16)", async () => {
    const { saveWhyEntryAction } = await import("@/lib/actions/fiveWhys");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-entry-cap");
    const analysis = await makeAnalysis(investigation.id);

    for (let i = 1; i <= 5; i++) {
      const formData = new FormData();
      formData.set("question", `Why #${i}?`);
      formData.set("answer", `Because reason ${i}.`);
      await saveWhyEntryAction(investigation.id, analysis.id, null, { error: null }, formData);
    }

    const sixthFormData = new FormData();
    sixthFormData.set("question", "Why #6?");
    sixthFormData.set("answer", "Because reason 6.");
    const result = await saveWhyEntryAction(investigation.id, analysis.id, null, { error: null }, sixthFormData);
    expect(result.error).not.toBeNull();
    expect(await db.fiveWhysEntry.count({ where: { fiveWhysAnalysisId: analysis.id } })).toBe(5);
  });

  it("renumbers remaining entries contiguously after removing one (FR-037)", async () => {
    const { saveWhyEntryAction, removeWhyEntryAction } = await import("@/lib/actions/fiveWhys");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-renumber");
    const analysis = await makeAnalysis(investigation.id);

    const entryIds: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const formData = new FormData();
      formData.set("question", `Why #${i}?`);
      formData.set("answer", `Because reason ${i}.`);
      await saveWhyEntryAction(investigation.id, analysis.id, null, { error: null }, formData);
    }
    const created = await db.fiveWhysEntry.findMany({ where: { fiveWhysAnalysisId: analysis.id }, orderBy: { sequenceNumber: "asc" } });
    entryIds.push(...created.map((e) => e.id));

    // Remove the middle entry (sequenceNumber 2).
    const result = await removeWhyEntryAction(investigation.id, analysis.id, entryIds[1]);
    expect(result.error).toBeNull();

    const remaining = await db.fiveWhysEntry.findMany({ where: { fiveWhysAnalysisId: analysis.id }, orderBy: { sequenceNumber: "asc" } });
    expect(remaining).toHaveLength(2);
    expect(remaining.map((e) => e.sequenceNumber)).toEqual([1, 2]);
    expect(remaining.map((e) => e.id)).toEqual([entryIds[0], entryIds[2]]);
  });

  it("deletes a whole analysis and clears (not deletes) any linked RootCause's fiveWhysAnalysisId (FR-037/onDelete SetNull)", async () => {
    const { deleteFiveWhysAnalysisAction } = await import("@/lib/actions/fiveWhys");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-delete-analysis");
    const analysis = await makeAnalysis(investigation.id);
    const rootCause = await db.rootCause.create({
      data: {
        investigationId: investigation.id,
        description: "A cause.",
        category: "Procedures",
        supportingEvidence: "Some evidence, at least ten characters.",
        confidenceLevel: "Medium",
        fiveWhysAnalysisId: analysis.id,
      },
    });

    const result = await deleteFiveWhysAnalysisAction(investigation.id, analysis.id);
    expect(result.error).toBeNull();
    expect(await db.fiveWhysAnalysis.findUnique({ where: { id: analysis.id } })).toBeNull();

    const updatedRootCause = await db.rootCause.findUniqueOrThrow({ where: { id: rootCause.id } });
    expect(updatedRootCause.fiveWhysAnalysisId).toBeNull();
  });

  it("generateFollowUpQuestionAction requires at least one existing entry (FR-036)", async () => {
    const { generateFollowUpQuestionAction } = await import("@/lib/actions/fiveWhys");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-suggest-empty");
    const analysis = await makeAnalysis(investigation.id);

    const result = await generateFollowUpQuestionAction(investigation.id, analysis.id);
    expect(result.error).not.toBeNull();
    expect(result.suggestion).toBeNull();
  });

  it("generateFollowUpQuestionAction templates a question from the latest answer (FR-036 positive)", async () => {
    const { saveWhyEntryAction, generateFollowUpQuestionAction } = await import("@/lib/actions/fiveWhys");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-suggest-positive");
    const analysis = await makeAnalysis(investigation.id);

    const formData = new FormData();
    formData.set("question", "Why did the aircraft depart the runway?");
    formData.set("answer", "the checklist step was skipped");
    await saveWhyEntryAction(investigation.id, analysis.id, null, { error: null }, formData);

    const result = await generateFollowUpQuestionAction(investigation.id, analysis.id);
    expect(result.error).toBeNull();
    expect(result.suggestion?.question).toBe("Why was the checklist step skipped?");
  });

  it("cascade-deletes FiveWhysEntry rows when the parent Investigation is deleted (TS-012-016)", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-fw-cascade");
    const analysis = await makeAnalysis(investigation.id);
    const entry = await db.fiveWhysEntry.create({
      data: { fiveWhysAnalysisId: analysis.id, sequenceNumber: 1, question: "Why?", answer: "Because." },
    });

    await db.investigation.delete({ where: { id: investigation.id } });
    expect(await db.fiveWhysEntry.findUnique({ where: { id: entry.id } })).toBeNull();
    expect(await db.fiveWhysAnalysis.findUnique({ where: { id: analysis.id } })).toBeNull();
  });
});
