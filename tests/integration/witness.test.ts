import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// revalidatePath requires a Next.js request-scoped "static generation
// store" that doesn't exist when a Server Action is called directly from
// a plain Vitest process (not routed through Next's own runtime) — mocked
// out since these tests exercise this project's own action logic (DB
// writes, validation, auth checks), not Next's caching behavior.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/**
 * Integration tests (technical-architecture.md §12) — require a real
 * database (DATABASE_URL/DIRECT_URL). Skipped, not deleted, without one.
 */
describe.skipIf(!process.env.DATABASE_URL)("Witness Management (FR-019/FR-020)", () => {
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

  it("adds a witness (positive)", async () => {
    const { saveWitnessAction } = await import("@/lib/actions/witness");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-witness-add");

    // A real submitted <form> always sends "" for an untouched optional
    // field (the input element exists in the DOM with an empty default
    // value) — FormData.get() only returns null for a key that was never
    // present at all, which .optional() doesn't accept. Setting these
    // explicitly matches actual browser form-submission behavior.
    const formData = new FormData();
    formData.set("name", "Capt. Reeves");
    formData.set("contactInfo", "");
    formData.set("witnessType", "Crew");
    formData.set("statementSummary", "Observed the aircraft veer left of centerline on rollout.");
    formData.set("statementDate", "");
    formData.set("reliabilityAssessment", "High");
    formData.set("reliabilityNotes", "");

    const result = await saveWitnessAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const witnesses = await db.witness.findMany({ where: { investigationId: investigation.id } });
    expect(witnesses).toHaveLength(1);
    expect(witnesses[0].name).toBe("Capt. Reeves");
  });

  it("rejects a statement summary under 10 characters (negative)", async () => {
    const { saveWitnessAction } = await import("@/lib/actions/witness");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-witness-invalid");

    const formData = new FormData();
    formData.set("name", "J. Smith");
    formData.set("witnessType", "Passenger");
    formData.set("statementSummary", "Too short");
    formData.set("reliabilityAssessment", "Medium");

    const result = await saveWitnessAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
    expect(result.fieldErrors?.statementSummary).toBeDefined();
  });

  it("removes a witness", async () => {
    const { removeWitnessAction } = await import("@/lib/actions/witness");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-witness-remove");
    const witness = await db.witness.create({
      data: {
        investigationId: investigation.id,
        name: "To Remove",
        witnessType: "Other",
        statementSummary: "A statement long enough to pass validation.",
        reliabilityAssessment: "Low",
      },
    });

    const result = await removeWitnessAction(investigation.id, witness.id);
    expect(result.error).toBeNull();
    expect(await db.witness.findUnique({ where: { id: witness.id } })).toBeNull();
  });

  it("toggleNoWitnessesAction rejects confirming 'none' while witnesses are still recorded (EC-09)", async () => {
    const { toggleNoWitnessesAction } = await import("@/lib/actions/witness");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-witness-toggle-blocked");
    await db.witness.create({
      data: {
        investigationId: investigation.id,
        name: "Still Here",
        witnessType: "Other",
        statementSummary: "A statement long enough to pass validation.",
        reliabilityAssessment: "Low",
      },
    });

    const result = await toggleNoWitnessesAction(investigation.id, true);
    expect(result.error).not.toBeNull();
  });

  it("toggleNoWitnessesAction succeeds with zero witnesses recorded (EC-09)", async () => {
    const { toggleNoWitnessesAction } = await import("@/lib/actions/witness");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-witness-toggle-ok");

    const result = await toggleNoWitnessesAction(investigation.id, true);
    expect(result.error).toBeNull();

    const occurrence = await db.occurrence.findUniqueOrThrow({ where: { investigationId: investigation.id } });
    expect(occurrence.noWitnessesConfirmed).toBe(true);
  });

  it("cascade-deletes Witness rows when the parent Investigation is deleted (TS-012-016)", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-witness-cascade");
    const witness = await db.witness.create({
      data: {
        investigationId: investigation.id,
        name: "Cascade Test",
        witnessType: "Other",
        statementSummary: "A statement long enough to pass validation.",
        reliabilityAssessment: "Low",
      },
    });

    await db.investigation.delete({ where: { id: investigation.id } });
    expect(await db.witness.findUnique({ where: { id: witness.id } })).toBeNull();
  });
});
