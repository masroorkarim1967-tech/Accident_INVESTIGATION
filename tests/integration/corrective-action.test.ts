import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)("Corrective Actions (FR-040/041/044/045a/045b/047)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-" } } });
    await db.$disconnect();
  });

  async function loginAs(email: string, role: UserRole) {
    const { auth } = await import("@/lib/auth");
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(user.id), role } } as never);
    return user;
  }

  beforeEach(async () => {
    await loginAs("r.okafor@investigations.example", UserRole.Investigator);
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

  it("rejects an action with no Responsible Person set — there is no such thing as an unowned action (EC-14 negative)", async () => {
    const { saveCorrectiveActionAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-add-no-owner");

    const formData = new FormData();
    formData.set("description", "Replace the worn brake assembly.");
    formData.set("priority", "High");
    formData.set("targetDate", futureDate(10));
    formData.set("requiredForClosure", "true");

    const result = await saveCorrectiveActionAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
    expect(await db.correctiveAction.count({ where: { investigationId: investigation.id } })).toBe(0);
  });

  it("adds an action with an external owner — requiredForClosure defaults true (positive)", async () => {
    const { saveCorrectiveActionAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-add-external-owner");

    const formData = new FormData();
    formData.set("description", "Replace the worn brake assembly.");
    formData.set("priority", "High");
    formData.set("targetDate", futureDate(10));
    formData.set("requiredForClosure", "true");
    formData.set("ownerExternalName", "Contract Maintenance Crew");

    const result = await saveCorrectiveActionAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const action = await db.correctiveAction.findFirstOrThrow({ where: { investigationId: investigation.id } });
    expect(action.status).toBe("Assigned");
    expect(action.requiredForClosure).toBe(true);
  });

  it("adding an action with an owner set auto-transitions to Assigned (data-model.md §6.9.1)", async () => {
    const { saveCorrectiveActionAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-add-with-owner");
    const owner = await db.user.findUniqueOrThrow({ where: { email: "j.bramwell@investigations.example" } });

    const formData = new FormData();
    formData.set("description", "Audit the maintenance sign-off process.");
    formData.set("priority", "Medium");
    formData.set("targetDate", futureDate(10));
    formData.set("requiredForClosure", "true");
    formData.set("ownerUserId", String(owner.id));

    const result = await saveCorrectiveActionAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const action = await db.correctiveAction.findFirstOrThrow({ where: { investigationId: investigation.id } });
    expect(action.status).toBe("Assigned");
    expect(action.ownerUserId).toBe(owner.id);
  });

  it("rejects a new action with both a registered owner and an external name (EC-14 mutual exclusivity)", async () => {
    const { saveCorrectiveActionAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-both-owners");
    const owner = await db.user.findUniqueOrThrow({ where: { email: "j.bramwell@investigations.example" } });

    const formData = new FormData();
    formData.set("description", "A test action.");
    formData.set("priority", "Low");
    formData.set("targetDate", futureDate(10));
    formData.set("requiredForClosure", "false");
    formData.set("ownerUserId", String(owner.id));
    formData.set("ownerExternalName", "Also External");

    const result = await saveCorrectiveActionAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
  });

  it("rejects a new action with a past Target Date, but allows editing an existing one to the past (FR-040 edge case)", async () => {
    const { saveCorrectiveActionAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-past-date");

    const pastFormData = new FormData();
    pastFormData.set("description", "A test action.");
    pastFormData.set("priority", "Low");
    pastFormData.set("targetDate", "2020-01-01");
    pastFormData.set("requiredForClosure", "false");
    pastFormData.set("ownerExternalName", "External Person");
    const createResult = await saveCorrectiveActionAction(investigation.id, null, { error: null }, pastFormData);
    expect(createResult.error).not.toBeNull();

    // Now create validly, then edit its Target Date into the past — allowed.
    const validFormData = new FormData();
    validFormData.set("description", "A test action.");
    validFormData.set("priority", "Low");
    validFormData.set("targetDate", futureDate(5));
    validFormData.set("requiredForClosure", "false");
    validFormData.set("ownerExternalName", "External Person");
    await saveCorrectiveActionAction(investigation.id, null, { error: null }, validFormData);
    const action = await db.correctiveAction.findFirstOrThrow({ where: { investigationId: investigation.id } });

    const editFormData = new FormData();
    editFormData.set("description", "A test action.");
    editFormData.set("priority", "Low");
    editFormData.set("targetDate", "2020-01-01");
    editFormData.set("requiredForClosure", "false");
    editFormData.set("ownerExternalName", "External Person");
    const editResult = await saveCorrectiveActionAction(investigation.id, action.id, { error: null }, editFormData);
    expect(editResult.error).toBeNull();
  });

  interface ActionOverrides {
    status?: "Open" | "Assigned" | "InProgress" | "Completed" | "Verified" | "Cancelled";
    ownerUserId?: number;
    completedDate?: Date;
    verificationMethod?: "FollowUpInspection" | "DataReview" | "Audit" | "Retest" | "StakeholderInterview" | "Other";
    effectivenessResult?: "Effective" | "PartiallyEffective" | "NotEffective" | "TooEarlyToAssess";
    verificationNotes?: string;
  }

  async function makeFixtureAction(investigationId: number, overrides: ActionOverrides = {}) {
    return db.correctiveAction.create({
      data: {
        investigationId,
        description: "A fixture action.",
        priority: "Medium",
        targetDate: new Date(futureDate(30)),
        requiredForClosure: true,
        ...overrides,
      },
    });
  }

  it("blocks an Investigator from deleting a Completed action, but allows an Administrator (FR-041)", async () => {
    const { removeCorrectiveActionAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-remove-blocked");
    const action = await makeFixtureAction(investigation.id, { status: "Completed", completedDate: new Date() });

    await loginAs("r.okafor@investigations.example", UserRole.Investigator);
    const blockedResult = await removeCorrectiveActionAction(investigation.id, action.id);
    expect(blockedResult.error).not.toBeNull();
    expect(await db.correctiveAction.findUnique({ where: { id: action.id } })).not.toBeNull();

    await loginAs("a.whitfield@investigations.example", UserRole.Administrator);
    const allowedResult = await removeCorrectiveActionAction(investigation.id, action.id);
    expect(allowedResult.error).toBeNull();
    expect(await db.correctiveAction.findUnique({ where: { id: action.id } })).toBeNull();
  });

  it("the action's owner can move Open -> InProgress; a non-owner Investigator cannot (FR-044)", async () => {
    const { updateCorrectiveActionStatusAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-transition-owner");
    const owner = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const action = await makeFixtureAction(investigation.id, { status: "Open", ownerUserId: owner.id });

    await loginAs("r.okafor@investigations.example", UserRole.Investigator);
    const result = await updateCorrectiveActionStatusAction(investigation.id, action.id, "InProgress");
    expect(result.error).toBeNull();
    expect((await db.correctiveAction.findUniqueOrThrow({ where: { id: action.id } })).status).toBe("InProgress");
  });

  it("marks an action Completed via FR-045a, then blocks the owner from verifying it themselves (FR-045b)", async () => {
    const { markCorrectiveActionCompleteAction, verifyCorrectiveActionEffectivenessAction } = await import(
      "@/lib/actions/correctiveAction"
    );
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-complete-then-verify");
    const owner = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const action = await makeFixtureAction(investigation.id, { status: "InProgress", ownerUserId: owner.id });

    await loginAs("r.okafor@investigations.example", UserRole.Investigator);
    const completeFormData = new FormData();
    completeFormData.set("completedDate", new Date().toISOString().slice(0, 10));
    const completeResult = await markCorrectiveActionCompleteAction(investigation.id, action.id, { error: null }, completeFormData);
    expect(completeResult.error).toBeNull();
    expect((await db.correctiveAction.findUniqueOrThrow({ where: { id: action.id } })).status).toBe("Completed");

    // Owner attempts to verify their own action — rejected.
    const verifyFormData = new FormData();
    verifyFormData.set("verificationMethod", "Audit");
    verifyFormData.set("effectivenessResult", "Effective");
    const ownerVerifyResult = await verifyCorrectiveActionEffectivenessAction(investigation.id, action.id, { error: null }, verifyFormData);
    expect(ownerVerifyResult.error).toMatch(/someone other than its owner/);

    // A Reviewer verifies it — accepted.
    await loginAs("j.bramwell@investigations.example", UserRole.Reviewer);
    const reviewerVerifyResult = await verifyCorrectiveActionEffectivenessAction(investigation.id, action.id, { error: null }, verifyFormData);
    expect(reviewerVerifyResult.error).toBeNull();
    const verified = await db.correctiveAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(verified.status).toBe("Verified");
    expect(verified.effectivenessResult).toBe("Effective");
  });

  it("reopening Completed -> InProgress clears the completion/verification record (FR-044 edge case)", async () => {
    const { updateCorrectiveActionStatusAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-reopen-clears");
    const action = await makeFixtureAction(investigation.id, {
      status: "Completed",
      completedDate: new Date(),
      verificationMethod: "Audit",
      effectivenessResult: "Effective",
      verificationNotes: "Looked fine.",
    });

    await loginAs("a.whitfield@investigations.example", UserRole.Administrator);
    const result = await updateCorrectiveActionStatusAction(investigation.id, action.id, "InProgress");
    expect(result.error).toBeNull();

    const reopened = await db.correctiveAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(reopened.status).toBe("InProgress");
    expect(reopened.completedDate).toBeNull();
    expect(reopened.verificationMethod).toBeNull();
    expect(reopened.effectivenessResult).toBeNull();
    expect(reopened.verificationNotes).toBeNull();
  });

  it("reassigning an Open action's owner auto-transitions it to Assigned (FR-047)", async () => {
    const { reassignCorrectiveActionOwnerAction } = await import("@/lib/actions/correctiveAction");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-reassign");
    const action = await makeFixtureAction(investigation.id, { status: "Open" });
    const newOwner = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });

    const formData = new FormData();
    formData.set("ownerUserId", String(newOwner.id));
    const result = await reassignCorrectiveActionOwnerAction(investigation.id, action.id, { error: null }, formData);
    expect(result.error).toBeNull();

    const updated = await db.correctiveAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(updated.ownerUserId).toBe(newOwner.id);
    expect(updated.status).toBe("Assigned");
  });

  it("cascade-deletes CorrectiveAction rows when the parent Investigation is deleted (TS-012-016)", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-ca-cascade");
    const action = await makeFixtureAction(investigation.id);
    await db.investigation.delete({ where: { id: investigation.id } });
    expect(await db.correctiveAction.findUnique({ where: { id: action.id } })).toBeNull();
  });
});
