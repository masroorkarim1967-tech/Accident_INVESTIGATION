import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)("Investigation Review / Closure (FR-049-052/FR-053a/FR-054)", () => {
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

  function futureDate(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  /** A fixture with just enough recorded to satisfy the Analysis -> Review gate. */
  async function makeReadyForReviewInvestigation(title: string, status: "Analysis" | "Review" = "Analysis") {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status,
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
    await db.hazard.create({
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
    await db.rootCause.create({
      data: {
        investigationId: investigation.id,
        description: "A cause.",
        category: "Procedures",
        supportingEvidence: "Sufficient supporting evidence text here.",
        confidenceLevel: "Medium",
      },
    });
    return investigation;
  }

  async function addAction(investigationId: number, requiredForClosure: boolean, ownerUserId: number) {
    return db.correctiveAction.create({
      data: {
        investigationId,
        description: "An action.",
        priority: "Medium",
        targetDate: futureDate(30),
        requiredForClosure,
        ownerUserId,
        status: "Assigned",
      },
    });
  }

  it("submitForReviewAction is blocked with unmet gate items, then succeeds once the gate is fully met (FR-049)", async () => {
    const { submitForReviewAction } = await import("@/lib/actions/review");
    const investigation = await makeReadyForReviewInvestigation("TEST-FIXTURE-review-submit-blocked");

    // No actions recorded yet — gate incomplete.
    const blockedResult = await submitForReviewAction(investigation.id);
    expect(blockedResult.error).not.toBeNull();
    expect(blockedResult.unmetItems?.length).toBeGreaterThan(0);

    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    await addAction(investigation.id, true, investigator.id);

    const okResult = await submitForReviewAction(investigation.id);
    expect(okResult.error).toBeNull();
    expect((await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } })).status).toBe("Review");
  });

  it("submitForReviewAction is only valid from Analysis status (negative, TS-023)", async () => {
    const { submitForReviewAction } = await import("@/lib/actions/review");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-review-submit-wrong-status",
        status: "Open",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
    const result = await submitForReviewAction(investigation.id);
    expect(result.error).toMatch(/current status/);

    // No partial side effect — status is untouched, never silently advanced.
    const reloaded = await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
    expect(reloaded.status).toBe("Open");
  });

  it("approveInvestigationAction is blocked while a requiredForClosure action is unresolved, and succeeds once resolved (FR-051)", async () => {
    const { approveInvestigationAction } = await import("@/lib/actions/review");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await makeReadyForReviewInvestigation("TEST-FIXTURE-review-approve-blocked", "Review");
    const action = await addAction(investigation.id, true, investigator.id);

    await loginAs("j.bramwell@investigations.example", UserRole.Reviewer);
    const blockedFormData = new FormData();
    const blockedResult = await approveInvestigationAction(investigation.id, { error: null }, blockedFormData);
    expect(blockedResult.error).not.toBeNull();
    expect(blockedResult.blockingActions?.some((a) => a.id === action.id)).toBe(true);

    await db.correctiveAction.update({ where: { id: action.id }, data: { status: "Completed", completedDate: new Date() } });

    const okResult = await approveInvestigationAction(investigation.id, { error: null }, new FormData());
    expect(okResult.error).toBeNull();
    const updated = await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
    expect(updated.status).toBe("Closed");
    expect(updated.closedAt).not.toBeNull();
  });

  it("requestChangesAction requires a comment and returns the investigation directly to Analysis (FR-052)", async () => {
    const { requestChangesAction } = await import("@/lib/actions/review");
    const investigation = await makeReadyForReviewInvestigation("TEST-FIXTURE-review-request-changes", "Review");

    await loginAs("j.bramwell@investigations.example", UserRole.Reviewer);
    const shortFormData = new FormData();
    shortFormData.set("comments", "Too short");
    const rejected = await requestChangesAction(investigation.id, { error: null }, shortFormData);
    expect(rejected.error).not.toBeNull();

    const validFormData = new FormData();
    validFormData.set("comments", "Please add more detail to the supporting evidence before resubmitting.");
    const accepted = await requestChangesAction(investigation.id, { error: null }, validFormData);
    expect(accepted.error).toBeNull();

    const updated = await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
    expect(updated.status).toBe("Analysis");

    const review = await db.investigationReview.findFirstOrThrow({ where: { investigationId: investigation.id } });
    expect(review.reviewDecision).toBe("ChangesRequested");
  });

  it("an InvestigationManager cannot approve or request changes — reserved to REVIEWER/ADMIN (product-spec §0.2)", async () => {
    const { approveInvestigationAction } = await import("@/lib/actions/review");
    const investigation = await makeReadyForReviewInvestigation("TEST-FIXTURE-review-manager-blocked", "Review");

    await loginAs("m.delacroix@investigations.example", UserRole.InvestigationManager);
    const result = await approveInvestigationAction(investigation.id, { error: null }, new FormData());
    expect(result.error).not.toBeNull();
  });

  it("overrideAndCloseAction (SR-021) bypasses the closure gate, requires a 20+ character justification, and is ADMIN-only", async () => {
    const { overrideAndCloseAction } = await import("@/lib/actions/closure");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await makeReadyForReviewInvestigation("TEST-FIXTURE-review-override", "Review");
    await addAction(investigation.id, true, investigator.id); // left unresolved on purpose

    // A Reviewer (not Admin) cannot use the override, even though they can ordinarily approve.
    await loginAs("j.bramwell@investigations.example", UserRole.Reviewer);
    const reviewerFormData = new FormData();
    reviewerFormData.set("justification", "This is a sufficiently long justification for testing.");
    const reviewerResult = await overrideAndCloseAction(investigation.id, { error: null }, reviewerFormData);
    expect(reviewerResult.error).not.toBeNull();
    expect((await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } })).status).toBe("Review");

    await loginAs("a.whitfield@investigations.example", UserRole.Administrator);
    const shortFormData = new FormData();
    shortFormData.set("justification", "Too short");
    const shortResult = await overrideAndCloseAction(investigation.id, { error: null }, shortFormData);
    expect(shortResult.error).not.toBeNull();

    const validFormData = new FormData();
    validFormData.set("justification", "Emergency regulatory deadline requires closing despite the outstanding action.");
    const validResult = await overrideAndCloseAction(investigation.id, { error: null }, validFormData);
    expect(validResult.error).toBeNull();

    const updated = await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
    expect(updated.status).toBe("Closed");

    const historyRow = await db.investigationHistory.findFirstOrThrow({
      where: { investigationId: investigation.id, eventType: "Closed" },
    });
    expect(historyRow.reasonText).toMatch(/Emergency regulatory deadline/);
  });

  it("overrideAndCloseAction is only valid from Review status, same scope as ordinary Approve (SR-021)", async () => {
    const { overrideAndCloseAction } = await import("@/lib/actions/closure");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-review-override-wrong-status",
        status: "Analysis",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });

    await loginAs("a.whitfield@investigations.example", UserRole.Administrator);
    const formData = new FormData();
    formData.set("justification", "Attempting to override from the wrong status entirely.");
    const result = await overrideAndCloseAction(investigation.id, { error: null }, formData);
    expect(result.error).toMatch(/Review status/);
  });

  it("reopenInvestigationAction moves a Closed investigation to UnderInvestigation (not directly Review/Analysis) and requires a reason", async () => {
    const { reopenInvestigationAction } = await import("@/lib/actions/closure");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-review-reopen",
        status: "Closed",
        closedAt: new Date(),
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });

    const shortFormData = new FormData();
    shortFormData.set("reopenReason", "Too short");
    const rejected = await reopenInvestigationAction(investigation.id, { error: null }, shortFormData);
    expect(rejected.error).not.toBeNull();

    const validFormData = new FormData();
    validFormData.set("reopenReason", "New evidence surfaced that requires further investigation.");
    const accepted = await reopenInvestigationAction(investigation.id, { error: null }, validFormData);
    expect(accepted.error).toBeNull();

    const updated = await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
    expect(updated.status).toBe("UnderInvestigation");
    expect(updated.closedAt).not.toBeNull(); // historical, not cleared (FR-054 edge case)
    expect(updated.reopenReason).toMatch(/New evidence/);
  });

  it("(SR-022) an Investigator can be reassigned while the investigation is in Review status", async () => {
    const { assignInvestigatorAction } = await import("@/lib/actions/investigation");
    const investigation = await makeReadyForReviewInvestigation("TEST-FIXTURE-review-reassign-sr022", "Review");
    const otherInvestigator = await db.user.create({
      data: {
        name: "Second Investigator",
        email: `second-investigator-${Date.now()}@investigations.example`,
        passwordHash: "not-a-real-hash",
        role: UserRole.Investigator,
        isActive: true,
      },
    });

    await loginAs("m.delacroix@investigations.example", UserRole.InvestigationManager);
    const formData = new FormData();
    formData.set("investigationId", String(investigation.id));
    formData.set("investigatorUserId", String(otherInvestigator.id));
    const result = await assignInvestigatorAction({ error: null }, formData);
    expect(result.error).toBeNull();

    const updated = await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
    expect(updated.assignedInvestigatorUserId).toBe(otherInvestigator.id);
    expect(updated.status).toBe("Review"); // reassignment alone never moves the stage

    // Reassign back before deleting the throwaway user — assignedInvestigatorUserId has no
    // cascade, so deleting a still-referenced User would fail the FK constraint.
    await db.investigation.update({
      where: { id: investigation.id },
      data: { assignedInvestigatorUserId: (await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } })).id },
    });
    await db.user.delete({ where: { id: otherInvestigator.id } });
  });
});
