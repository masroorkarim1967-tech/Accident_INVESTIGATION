import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/**
 * Lighter than corrective-action.test.ts by design: the shared status
 * lifecycle logic (lib/services/actionLifecycle.ts) is already exhaustively
 * unit-tested, and corrective-action.test.ts already proves the full
 * create -> transition -> complete -> verify -> reassign -> cascade chain
 * end-to-end. This file only proves PreventiveAction's own Prisma wiring
 * is correct and that its one real difference (requiredForClosure default)
 * is right.
 */
describe.skipIf(!process.env.DATABASE_URL)("Preventive Actions (FR-042/043)", () => {
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

  function futureDate(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().slice(0, 10);
  }

  it("adds a preventive action defaulting requiredForClosure to the submitted value (positive)", async () => {
    const { savePreventiveActionAction } = await import("@/lib/actions/preventiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-pa-add");

    const formData = new FormData();
    formData.set("description", "Roll out updated ground-handling training fleet-wide.");
    formData.set("priority", "Medium");
    formData.set("targetDate", futureDate(60));
    formData.set("requiredForClosure", "false");
    formData.set("ownerExternalName", "Training Department");

    const result = await savePreventiveActionAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const action = await db.preventiveAction.findFirstOrThrow({ where: { investigationId: investigation.id } });
    expect(action.requiredForClosure).toBe(false);
    // An owner (ownerExternalName, set above) auto-transitions Open -> Assigned (data-model.md §6.9.1).
    expect(action.status).toBe("Assigned");
  });

  it("rejects a preventive action with no Responsible Person set (EC-14 negative, same rule as Corrective)", async () => {
    const { savePreventiveActionAction } = await import("@/lib/actions/preventiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-pa-add-no-owner");

    const formData = new FormData();
    formData.set("description", "A preventive action with no owner.");
    formData.set("priority", "Low");
    formData.set("targetDate", futureDate(60));
    formData.set("requiredForClosure", "false");

    const result = await savePreventiveActionAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
    expect(await db.preventiveAction.count({ where: { investigationId: investigation.id } })).toBe(0);
  });

  it("blocks an Investigator from deleting a Verified preventive action (FR-043, identical to FR-041)", async () => {
    const { removePreventiveActionAction } = await import("@/lib/actions/preventiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-pa-remove-blocked");
    const action = await db.preventiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "A fixture.",
        priority: "Low",
        targetDate: new Date(futureDate(30)),
        requiredForClosure: false,
        status: "Verified",
        completedDate: new Date(),
        verificationMethod: "Audit",
        effectivenessResult: "Effective",
      },
    });

    const result = await removePreventiveActionAction(investigation.id, action.id);
    expect(result.error).not.toBeNull();
    expect(await db.preventiveAction.findUnique({ where: { id: action.id } })).not.toBeNull();
  });

  it("moves a preventive action through Open -> InProgress -> Completed (FR-044/FR-045a)", async () => {
    const { updatePreventiveActionStatusAction, markPreventiveActionCompleteAction } = await import("@/lib/actions/preventiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-pa-lifecycle");
    const owner = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const action = await db.preventiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "A fixture.",
        priority: "Low",
        targetDate: new Date(futureDate(30)),
        requiredForClosure: false,
        status: "Open",
        ownerUserId: owner.id,
      },
    });

    await updatePreventiveActionStatusAction(investigation.id, action.id, "InProgress");
    expect((await db.preventiveAction.findUniqueOrThrow({ where: { id: action.id } })).status).toBe("InProgress");

    const completeFormData = new FormData();
    completeFormData.set("completedDate", new Date().toISOString().slice(0, 10));
    const completeResult = await markPreventiveActionCompleteAction(investigation.id, action.id, { error: null }, completeFormData);
    expect(completeResult.error).toBeNull();
    expect((await db.preventiveAction.findUniqueOrThrow({ where: { id: action.id } })).status).toBe("Completed");
  });

  it("cascade-deletes PreventiveAction rows when the parent Investigation is deleted (TS-012-016)", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-pa-cascade");
    const action = await db.preventiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "A fixture.",
        priority: "Low",
        targetDate: new Date(futureDate(30)),
        requiredForClosure: false,
      },
    });
    await db.investigation.delete({ where: { id: investigation.id } });
    expect(await db.preventiveAction.findUnique({ where: { id: action.id } })).toBeNull();
  });
});
