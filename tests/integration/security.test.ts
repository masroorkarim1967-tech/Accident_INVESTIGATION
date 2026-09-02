import { describe, expect, it, vi, afterAll } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/** testing-spec.md §4.11 (TS-050-054) — security-spec.md's controls. */
describe.skipIf(!process.env.DATABASE_URL)("Security (security-spec.md, TS-050-054)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-security-" } } });
    await db.$disconnect();
  });

  async function loginAs(email: string, role: UserRole) {
    const { auth } = await import("@/lib/auth");
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(user.id), role } } as never);
    return user;
  }

  async function makeFixtureInvestigation(title: string, investigatorId: number) {
    return db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status: "Open",
        reporterName: "Test Reporter",
        createdByUserId: investigatorId,
        assignedInvestigatorUserId: investigatorId,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
  }

  it("stores a SQL-injection payload as inert text, leaving the Investigation table fully intact (negative, TS-050)", async () => {
    const investigator = await loginAs("r.okafor@investigations.example", UserRole.Investigator);
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-security-sqli", investigator.id);
    const countBefore = await db.investigation.count();

    const { saveOccurrenceNarrativeAction } = await import("@/lib/actions/occurrence");
    const payload = `'; DROP TABLE "Investigation"; --`;
    const formData = new FormData();
    formData.set("occurrenceDate", "2026-03-15");
    formData.set("occurrenceTimeUtc", "12:00");
    formData.set("phaseOfFlight", "Cruise");
    formData.set("briefDescription", "SQL injection fixture.");
    formData.set("narrativeDescription", `Fixture narrative containing a payload: ${payload}`);

    const result = await saveOccurrenceNarrativeAction(investigation.id, { error: null }, formData);
    expect(result.error).toBeNull();

    // Prisma's parameterized queries store the payload as inert text — a
    // saveOccurrenceNarrativeAction call never adds/removes an
    // Investigation row, so the count is unchanged (an executed DROP TABLE
    // would have reduced this to 0).
    expect(await db.investigation.count()).toBe(countBefore);
    const occurrence = await db.occurrence.findUniqueOrThrow({ where: { investigationId: investigation.id } });
    expect(occurrence.narrativeDescription).toContain(payload);
  });

  it("stores an XSS payload verbatim as literal text, never sanitized/mangled/executed server-side (negative, TS-051)", async () => {
    const investigator = await loginAs("r.okafor@investigations.example", UserRole.Investigator);
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-security-xss", investigator.id);

    const { saveOccurrenceNarrativeAction } = await import("@/lib/actions/occurrence");
    const payload = "<script>alert(1)</script>";
    const formData = new FormData();
    formData.set("occurrenceDate", "2026-03-15");
    formData.set("occurrenceTimeUtc", "12:00");
    formData.set("phaseOfFlight", "Cruise");
    formData.set("briefDescription", "XSS fixture.");
    formData.set("narrativeDescription", `Fixture narrative containing a payload: ${payload}`);

    const result = await saveOccurrenceNarrativeAction(investigation.id, { error: null }, formData);
    expect(result.error).toBeNull();

    // Stored verbatim, not stripped/escaped at write time — safety comes
    // from React's render-time escaping (verified in tests/e2e), never
    // from mutating what was actually submitted.
    const occurrence = await db.occurrence.findUniqueOrThrow({ where: { investigationId: investigation.id } });
    expect(occurrence.narrativeDescription).toContain(payload);
  });

  it("rejects a Viewer session calling the create-Hazard Server Action directly, with no Hazard row created (negative, TS-052)", async () => {
    const admin = await loginAs("a.whitfield@investigations.example", UserRole.Administrator);
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-security-viewer-hazard", admin.id);
    await loginAs("viewer@investigations.example", UserRole.Viewer);

    const { saveHazardAction } = await import("@/lib/actions/hazard");
    const formData = new FormData();
    formData.set("description", "Viewer should not be able to create this.");
    formData.set("hazardCategory", "Other");
    formData.set("initialLikelihood", "Rare");
    formData.set("initialSeverity", "Negligible");

    const result = await saveHazardAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeTruthy();
    expect(await db.hazard.count({ where: { investigationId: investigation.id } })).toBe(0);
  });

  // TS-053 (Origin-header verification for Route Handlers) and TS-054
  // (rate-limited login) are covered elsewhere: TS-053 depends on
  // security-spec.md §4's CSRF/Origin check, which is Phase 15's job
  // (not yet built — see this phase's report); TS-054 is already covered
  // by tests/integration/auth.test.ts.
});
