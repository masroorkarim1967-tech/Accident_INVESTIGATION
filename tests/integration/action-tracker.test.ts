import { describe, expect, it, afterAll } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";
import { listPortfolioActions } from "@/lib/services/actionQueries";

/**
 * FR-070 — Portfolio-Wide Action Tracker. Verifies role-scoped visibility
 * (reusing investigationQueries.ts's visibilityFilter, same as FR-007) and
 * that Status filtering correctly treats "Overdue" as a derived condition
 * rather than a stored value.
 */
describe.skipIf(!process.env.DATABASE_URL)("Action Tracker (FR-070)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-" } } });
    await db.$disconnect();
  });

  async function makeFixtureInvestigation(title: string, status: "Draft" | "Open" = "Open") {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    return db.investigation.create({
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
  }

  function daysFromNow(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  }

  it("a Viewer sees actions only on non-Draft investigations (FR-007 scoping, applied via FR-070)", async () => {
    const draftInvestigation = await makeFixtureInvestigation("TEST-FIXTURE-tracker-draft", "Draft");
    await db.correctiveAction.create({
      data: {
        investigationId: draftInvestigation.id,
        description: "Draft-only action.",
        priority: "Low",
        targetDate: daysFromNow(30),
        requiredForClosure: false,
      },
    });
    const openInvestigation = await makeFixtureInvestigation("TEST-FIXTURE-tracker-open");
    await db.correctiveAction.create({
      data: {
        investigationId: openInvestigation.id,
        description: "Open-investigation action.",
        priority: "Low",
        targetDate: daysFromNow(30),
        requiredForClosure: false,
      },
    });

    const viewer = await db.user.findUniqueOrThrow({ where: { email: "viewer@investigations.example" } });
    const rows = await listPortfolioActions({ currentUser: { id: viewer.id, role: UserRole.Viewer } });
    const descriptions = rows.map((r) => r.description);
    expect(descriptions).not.toContain("Draft-only action.");
    expect(descriptions).toContain("Open-investigation action.");
  });

  it("an Investigator sees only actions on investigations they created or are assigned to", async () => {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const otherInvestigator = await db.user.findUniqueOrThrow({ where: { email: "a.whitfield@investigations.example" } });

    const ownInvestigation = await makeFixtureInvestigation("TEST-FIXTURE-tracker-own");
    await db.correctiveAction.create({
      data: {
        investigationId: ownInvestigation.id,
        description: "My own investigation's action.",
        priority: "Low",
        targetDate: daysFromNow(30),
        requiredForClosure: false,
      },
    });

    const foreignInvestigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-tracker-foreign",
        status: "Open",
        reporterName: "Test Reporter",
        createdByUserId: otherInvestigator.id,
        assignedInvestigatorUserId: otherInvestigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
    await db.correctiveAction.create({
      data: {
        investigationId: foreignInvestigation.id,
        description: "Someone else's investigation's action.",
        priority: "Low",
        targetDate: daysFromNow(30),
        requiredForClosure: false,
      },
    });

    const rows = await listPortfolioActions({ currentUser: { id: investigator.id, role: UserRole.Investigator } });
    const descriptions = rows.map((r) => r.description);
    expect(descriptions).toContain("My own investigation's action.");
    expect(descriptions).not.toContain("Someone else's investigation's action.");
  });

  it("selecting the 'Overdue' status filter returns only derived-overdue actions, not the Open stored status generally", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-tracker-overdue-filter");
    await db.correctiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "Overdue open action.",
        priority: "Low",
        targetDate: daysFromNow(-5),
        requiredForClosure: false,
        status: "Open",
      },
    });
    await db.correctiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "Not-yet-due open action.",
        priority: "Low",
        targetDate: daysFromNow(5),
        requiredForClosure: false,
        status: "Open",
      },
    });

    const admin = await db.user.findUniqueOrThrow({ where: { email: "a.whitfield@investigations.example" } });
    const rows = await listPortfolioActions({
      currentUser: { id: admin.id, role: UserRole.Administrator },
      statuses: [],
      includeOverdue: true,
      investigationIds: [investigation.id],
    });
    const descriptions = rows.map((r) => r.description);
    expect(descriptions).toContain("Overdue open action.");
    expect(descriptions).not.toContain("Not-yet-due open action.");
  });

  it("filters by Priority", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-tracker-priority-filter");
    await db.correctiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "Critical priority action.",
        priority: "Critical",
        targetDate: daysFromNow(30),
        requiredForClosure: false,
      },
    });
    await db.correctiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "Low priority action.",
        priority: "Low",
        targetDate: daysFromNow(30),
        requiredForClosure: false,
      },
    });

    const admin = await db.user.findUniqueOrThrow({ where: { email: "a.whitfield@investigations.example" } });
    const rows = await listPortfolioActions({
      currentUser: { id: admin.id, role: UserRole.Administrator },
      priorities: ["Critical"],
      investigationIds: [investigation.id],
    });
    const descriptions = rows.map((r) => r.description);
    expect(descriptions).toContain("Critical priority action.");
    expect(descriptions).not.toContain("Low priority action.");
  });

  it("combines Corrective and Preventive actions in one result set", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-tracker-combined");
    await db.correctiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "A corrective action.",
        priority: "Low",
        targetDate: daysFromNow(30),
        requiredForClosure: false,
      },
    });
    await db.preventiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "A preventive action.",
        priority: "Low",
        targetDate: daysFromNow(30),
        requiredForClosure: false,
      },
    });

    const admin = await db.user.findUniqueOrThrow({ where: { email: "a.whitfield@investigations.example" } });
    const rows = await listPortfolioActions({
      currentUser: { id: admin.id, role: UserRole.Administrator },
      investigationIds: [investigation.id],
    });
    expect(rows.map((r) => r.kind).sort()).toEqual(["Corrective", "Preventive"]);
  });
});
