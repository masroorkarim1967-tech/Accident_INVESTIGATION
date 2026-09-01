import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { generateReferenceNumber } from "@/lib/services/referenceNumber";
import { visibilityFilter } from "@/lib/services/investigationQueries";
import { UserRole, HistoryEventType } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Integration tests (technical-architecture.md §12) — require a real
 * database connection (DATABASE_URL/DIRECT_URL). Skipped, not deleted,
 * when no DATABASE_URL is configured in this environment — the same
 * blocker recorded in Phases 2-3. Run these against a real (ideally
 * disposable/branch) Postgres database once one is available.
 */
describe.skipIf(!process.env.DATABASE_URL)("generateReferenceNumber (FR-005, DM-16 / SR-013)", () => {
  it("produces the INC-YYYY-NNNN format", async () => {
    const referenceNumber = await generateReferenceNumber(new Date("2026-06-15T00:00:00Z"));
    expect(referenceNumber).toMatch(/^INC-2026-\d{4}$/);
  });

  it("is collision-free under concurrent generation in the same year", async () => {
    const sameYear = new Date("2026-06-15T00:00:00Z");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => generateReferenceNumber(sameYear)),
    );
    expect(new Set(results).size).toBe(10);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("listInvestigations role-scoped visibility (FR-007)", () => {
  it("Administrator's filter has no restriction", () => {
    const filter = visibilityFilter({ id: 1, role: UserRole.Administrator });
    expect(filter).toEqual({});
  });

  it("Investigator's filter restricts to created-or-assigned", () => {
    const filter = visibilityFilter({ id: 5, role: UserRole.Investigator });
    expect(filter).toEqual({
      OR: [{ createdByUserId: 5 }, { assignedInvestigatorUserId: 5 }],
    });
  });

  it("Viewer's filter excludes Draft investigations", () => {
    const filter = visibilityFilter({ id: 9, role: UserRole.Viewer });
    expect(filter).toEqual({ status: { not: "Draft" } });
  });
});

describe.skipIf(!process.env.DATABASE_URL)("createInvestigationAction end-to-end (FR-005)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-" } } });
    await db.$disconnect();
  });

  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    const investigator = await db.user.findUniqueOrThrow({
      where: { email: "r.okafor@investigations.example" },
    });
    vi.mocked(auth).mockResolvedValue({
      user: { id: String(investigator.id), role: UserRole.Investigator },
    } as never);
  });

  it("creates an Investigation, its minimal Occurrence row, and a Created history entry", async () => {
    const { createInvestigationAction } = await import("@/lib/actions/investigation");

    const formData = new FormData();
    formData.set("title", "TEST-FIXTURE-Ramp vehicle contact");
    formData.set("occurrenceDate", "2026-03-01");
    formData.set("reporterName", "Test Reporter");

    // createInvestigationAction calls next/navigation's redirect() on
    // success, which throws a NEXT_REDIRECT signal by design — the
    // investigation is already committed by the time it throws.
    await expect(createInvestigationAction({ error: null }, formData)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    const created = await db.investigation.findFirst({
      where: { title: "TEST-FIXTURE-Ramp vehicle contact" },
      include: { occurrence: true, historyEntries: true },
    });

    expect(created).not.toBeNull();
    expect(created?.status).toBe("Draft");
    expect(created?.referenceNumber).toMatch(/^INC-\d{4}-\d{4}$/);
    expect(created?.occurrence?.occurrenceDateUtc.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(created?.historyEntries).toHaveLength(1);
    expect(created?.historyEntries[0].eventType).toBe(HistoryEventType.Created);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("assignInvestigatorAction end-to-end (FR-006)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-" } } });
    await db.user.deleteMany({ where: { email: "test-fixture-inactive@investigations.example" } });
    await db.$disconnect();
  });

  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    const admin = await db.user.findUniqueOrThrow({
      where: { email: "a.whitfield@investigations.example" },
    });
    vi.mocked(auth).mockResolvedValue({
      user: { id: String(admin.id), role: UserRole.Administrator },
    } as never);
  });

  async function makeFixtureInvestigation(title: string, status: "Open" | "Review" | "Closed" = "Open") {
    const admin = await db.user.findUniqueOrThrow({ where: { email: "a.whitfield@investigations.example" } });
    return db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status,
        reporterName: "Test Reporter",
        createdByUserId: admin.id,
      },
    });
  }

  it("assigns an active Investigator and logs InvestigatorAssigned (positive)", async () => {
    const { assignInvestigatorAction } = await import("@/lib/actions/investigation");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-assign-positive");
    const investigator = await db.user.findUniqueOrThrow({
      where: { email: "r.okafor@investigations.example" },
    });

    const formData = new FormData();
    formData.set("investigationId", String(investigation.id));
    formData.set("investigatorUserId", String(investigator.id));

    const result = await assignInvestigatorAction({ error: null }, formData);
    expect(result.error).toBeNull();

    const updated = await db.investigation.findUniqueOrThrow({
      where: { id: investigation.id },
      include: { historyEntries: true },
    });
    expect(updated.assignedInvestigatorUserId).toBe(investigator.id);
    expect(updated.historyEntries.map((h) => h.eventType)).toContain(HistoryEventType.InvestigatorAssigned);
  });

  it("rejects assigning a deactivated Investigator (negative — spec-review.md SR-016)", async () => {
    const { assignInvestigatorAction } = await import("@/lib/actions/investigation");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-assign-inactive");
    const inactiveInvestigator = await db.user.create({
      data: {
        name: "Inactive Test Investigator",
        email: "test-fixture-inactive@investigations.example",
        passwordHash: "irrelevant-for-this-test",
        role: UserRole.Investigator,
        isActive: false,
      },
    });

    const formData = new FormData();
    formData.set("investigationId", String(investigation.id));
    formData.set("investigatorUserId", String(inactiveInvestigator.id));

    const result = await assignInvestigatorAction({ error: null }, formData);
    expect(result.error).not.toBeNull();

    const unchanged = await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
    expect(unchanged.assignedInvestigatorUserId).toBeNull();
  });

  it("rejects reassignment on a Closed investigation (negative)", async () => {
    const { assignInvestigatorAction } = await import("@/lib/actions/investigation");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-assign-closed", "Closed");
    const investigator = await db.user.findUniqueOrThrow({
      where: { email: "r.okafor@investigations.example" },
    });

    const formData = new FormData();
    formData.set("investigationId", String(investigation.id));
    formData.set("investigatorUserId", String(investigator.id));

    const result = await assignInvestigatorAction({ error: null }, formData);
    expect(result.error).toContain("closed");
  });

  it("permits reassignment during Review (positive — spec-review.md SR-022)", async () => {
    const { assignInvestigatorAction } = await import("@/lib/actions/investigation");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-assign-review", "Review");
    const investigator = await db.user.findUniqueOrThrow({
      where: { email: "r.okafor@investigations.example" },
    });

    const formData = new FormData();
    formData.set("investigationId", String(investigation.id));
    formData.set("investigatorUserId", String(investigator.id));

    const result = await assignInvestigatorAction({ error: null }, formData);
    expect(result.error).toBeNull();

    const updated = await db.investigation.findUniqueOrThrow({ where: { id: investigation.id } });
    expect(updated.assignedInvestigatorUserId).toBe(investigator.id);
    expect(updated.status).toBe("Review"); // reassignment must not itself change status
  });
});
