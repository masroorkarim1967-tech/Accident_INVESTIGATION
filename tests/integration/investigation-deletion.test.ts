import { describe, expect, it, vi, afterAll } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";
import { deleteDraftInvestigationAction } from "@/lib/actions/investigation";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

/** testing-spec.md §4.3 (TS-012-016) — schema constraints, cascade/RESTRICT/SET NULL behavior. */
describe.skipIf(!process.env.DATABASE_URL)("Database constraints (FR-055, data-model.md §1, TS-012-016)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-dbtest-" } } });
    await db.$disconnect();
  });

  async function asAdmin() {
    const { auth } = await import("@/lib/auth");
    const admin = await db.user.findUniqueOrThrow({ where: { email: "a.whitfield@investigations.example" } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(admin.id), role: UserRole.Administrator } } as never);
    return admin;
  }

  async function makeDraftInvestigation(title: string) {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    return db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status: "Draft",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
  }

  it("deletes a Draft investigation and cascades every child row, leaving nothing orphaned (positive, TS-012)", async () => {
    await asAdmin();
    const investigation = await makeDraftInvestigation("TEST-FIXTURE-dbtest-cascade");

    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "Fixture hazard.",
        hazardCategory: "Other",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });
    const evidence = await db.evidence.create({
      data: {
        investigationId: investigation.id,
        evidenceType: "Documents",
        description: "Fixture evidence.",
        source: "Test",
        relevance: "Low",
        reliabilityAssessment: "Low",
      },
    });
    const person = await db.person.create({ data: { investigationId: investigation.id, name: "Fixture Person", roleType: "Other" } });

    const result = await deleteDraftInvestigationAction(investigation.id, { error: null }, new FormData());
    expect(result?.error ?? null).toBeNull();

    expect(await db.investigation.findUnique({ where: { id: investigation.id } })).toBeNull();
    expect(await db.hazard.findUnique({ where: { id: hazard.id } })).toBeNull();
    expect(await db.evidence.findUnique({ where: { id: evidence.id } })).toBeNull();
    expect(await db.person.findUnique({ where: { id: person.id } })).toBeNull();
  });

  it("rejects deleting a non-Draft investigation, with no partial deletion (negative, TS-013)", async () => {
    await asAdmin();
    const investigation = await makeDraftInvestigation("TEST-FIXTURE-dbtest-reject-open");
    await db.investigation.update({ where: { id: investigation.id }, data: { status: "Open" } });

    const result = await deleteDraftInvestigationAction(investigation.id, { error: null }, new FormData());
    expect(result?.error).toMatch(/Draft/);

    expect(await db.investigation.findUnique({ where: { id: investigation.id } })).not.toBeNull();
  });

  it("rejects an Occurrence with an invalid occurrenceCategory enum value at the database layer (negative, TS-014)", async () => {
    const investigation = await makeDraftInvestigation("TEST-FIXTURE-dbtest-bad-enum");
    await expect(
      db.$executeRawUnsafe(
        `UPDATE "Occurrence" SET "occurrenceCategory" = 'NotARealCategory' WHERE "investigationId" = $1`,
        investigation.id,
      ),
    ).rejects.toThrow();
  });

  it("SETs NULL on PreventiveAction.hazardId when the referenced Hazard is deleted, rather than deleting the action (positive, TS-015)", async () => {
    const investigation = await makeDraftInvestigation("TEST-FIXTURE-dbtest-setnull");
    const hazard = await db.hazard.create({
      data: {
        investigationId: investigation.id,
        description: "Fixture hazard for SET NULL test.",
        hazardCategory: "Other",
        initialLikelihood: "Rare",
        initialSeverity: "Negligible",
        initialRiskScore: 1,
        initialRiskBand: "Low",
      },
    });
    const action = await db.preventiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "Fixture preventive action.",
        priority: "Low",
        targetDate: new Date("2027-01-01"),
        ownerExternalName: "External",
        hazardId: hazard.id,
      },
    });

    await db.hazard.delete({ where: { id: hazard.id } });

    const reloaded = await db.preventiveAction.findUnique({ where: { id: action.id } });
    expect(reloaded).not.toBeNull();
    expect(reloaded!.hazardId).toBeNull();
  });

  it("restricts deleting a User referenced as Investigation.createdByUserId (negative, TS-016)", async () => {
    const investigation = await makeDraftInvestigation("TEST-FIXTURE-dbtest-restrict-user");
    const creator = await db.user.findUniqueOrThrow({ where: { id: investigation.createdByUserId } });

    await expect(db.user.delete({ where: { id: creator.id } })).rejects.toThrow();

    // The user must still exist afterward — the rejection was not partial.
    expect(await db.user.findUnique({ where: { id: creator.id } })).not.toBeNull();
  });
});
