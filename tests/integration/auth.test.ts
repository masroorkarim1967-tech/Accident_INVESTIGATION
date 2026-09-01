import { describe, expect, it, vi, afterAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/services/loginRateLimit";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const TEST_IDENTIFIER = "test-fixture-rate-limit@investigations.example";

describe.skipIf(!process.env.DATABASE_URL)("Login rate limiting (security-spec.md §14, TS-054)", () => {
  afterEach(async () => {
    await db.loginAttempt.deleteMany({ where: { identifier: TEST_IDENTIFIER } });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("is not rate-limited before the threshold (positive)", async () => {
    for (let i = 0; i < 4; i++) {
      await recordLoginAttempt({ identifier: TEST_IDENTIFIER, ipAddress: null, succeeded: false, userId: null });
    }
    expect(await isLoginRateLimited(TEST_IDENTIFIER)).toBe(false);
  });

  it("rate-limits after 5 failed attempts within the window, even with a correct password (negative, TS-054)", async () => {
    for (let i = 0; i < 5; i++) {
      await recordLoginAttempt({ identifier: TEST_IDENTIFIER, ipAddress: null, succeeded: false, userId: null });
    }
    expect(await isLoginRateLimited(TEST_IDENTIFIER)).toBe(true);
  });

  it("does not rate-limit a different identifier (no cross-account bleed)", async () => {
    for (let i = 0; i < 5; i++) {
      await recordLoginAttempt({ identifier: TEST_IDENTIFIER, ipAddress: null, succeeded: false, userId: null });
    }
    expect(await isLoginRateLimited("someone-else@investigations.example")).toBe(false);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("requireRole (technical-architecture.md §4.4 addendum, NFR-4.7)", () => {
  afterAll(async () => {
    await db.user.deleteMany({ where: { email: "test-fixture-requirerole@investigations.example" } });
    await db.$disconnect();
  });

  it("succeeds for an active user with an allowed role (positive)", async () => {
    const { auth } = await import("@/lib/auth");
    const { requireRole } = await import("@/lib/auth/requireRole");
    const admin = await db.user.findUniqueOrThrow({ where: { email: "a.whitfield@investigations.example" } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(admin.id) } } as never);

    const result = await requireRole([UserRole.Administrator]);
    expect(result.id).toBe(admin.id);
  });

  it("rejects a role not in the allowed list (negative — matches TS-052's pattern)", async () => {
    const { auth } = await import("@/lib/auth");
    const { requireRole } = await import("@/lib/auth/requireRole");
    const viewer = await db.user.findUniqueOrThrow({ where: { email: "viewer@investigations.example" } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(viewer.id) } } as never);

    await expect(requireRole([UserRole.Administrator])).rejects.toThrow();
  });

  it("rejects a deactivated user even if the JWT's stale role would otherwise be allowed (negative)", async () => {
    const { auth } = await import("@/lib/auth");
    const { requireRole } = await import("@/lib/auth/requireRole");
    const deactivated = await db.user.create({
      data: {
        name: "Deactivated Test Admin",
        email: "test-fixture-requirerole@investigations.example",
        passwordHash: "irrelevant-for-this-test",
        role: UserRole.Administrator,
        isActive: false,
      },
    });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(deactivated.id) } } as never);

    await expect(requireRole([UserRole.Administrator])).rejects.toThrow();
  });

  it("rejects when there is no session at all (negative)", async () => {
    const { auth } = await import("@/lib/auth");
    const { requireRole } = await import("@/lib/auth/requireRole");
    vi.mocked(auth).mockResolvedValue(null as never);

    await expect(requireRole([UserRole.Administrator])).rejects.toThrow();
  });
});
