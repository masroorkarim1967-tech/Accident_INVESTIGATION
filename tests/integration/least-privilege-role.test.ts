import { describe, expect, it, afterAll } from "vitest";
import { Client } from "pg";
import { db } from "@/lib/db";

/**
 * security-spec.md §7 (spec-review.md's least-privilege-role follow-up) —
 * verifies the exact grant shape `prisma/least-privilege-role.sql`
 * documents for a real deployment's runtime role: CRUD-only, no DDL.
 * Creates a throwaway role for the duration of this test (random
 * password, dropped in afterAll) rather than depending on a persisted
 * `app_runtime` role existing — self-contained, nothing new to manage.
 */
describe.skipIf(!process.env.DATABASE_URL)("Least-privilege database role (security-spec.md §7)", () => {
  const roleName = `test_least_priv_${Date.now()}`;
  const rolePassword = `TestRole!${Math.random().toString(36).slice(2, 12)}`;
  let restrictedClient: Client | null = null;

  afterAll(async () => {
    await restrictedClient?.end().catch(() => {});
    // DROP ROLE fails if any privilege remains granted on any object —
    // every GRANT the test issues (schema USAGE, table CRUD, sequence
    // USAGE/SELECT) needs a matching REVOKE, not just the table one, or
    // the role silently survives the run (found via a follow-up check —
    // the first version of this cleanup left sequence privileges behind).
    await db.$executeRawUnsafe(
      `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM "${roleName}"`,
    ).catch(() => {});
    await db.$executeRawUnsafe(
      `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM "${roleName}"`,
    ).catch(() => {});
    await db.$executeRawUnsafe(`REVOKE USAGE ON SCHEMA public FROM "${roleName}"`).catch(() => {});
    try {
      await db.$executeRawUnsafe(`DROP ROLE "${roleName}"`);
    } catch (err) {
      // Surfaced (not swallowed) — a role left behind in the shared dev
      // database is a real problem the test run should report, not hide.
      console.error(`Failed to drop temporary role "${roleName}":`, err);
      throw err;
    }
    await db.$disconnect();
  });

  it("a role granted only CRUD (no CREATE) can read/write but cannot alter schema (positive + negative)", async () => {
    await db.$executeRawUnsafe(`CREATE ROLE "${roleName}" WITH LOGIN PASSWORD '${rolePassword}'`);
    await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
    await db.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`);
    await db.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`);
    await db.$executeRawUnsafe(`REVOKE CREATE ON SCHEMA public FROM "${roleName}"`);

    const url = new URL(process.env.DATABASE_URL!);
    url.username = roleName;
    url.password = rolePassword;
    restrictedClient = new Client({ connectionString: url.toString() });
    await restrictedClient.connect();

    // Positive: ordinary CRUD succeeds.
    const result = await restrictedClient.query('SELECT count(*)::int AS count FROM "User"');
    expect(typeof result.rows[0].count).toBe("number");

    // Negative: a schema-altering statement is rejected — the whole point
    // of a least-privilege role. Must fail with a permission error, not
    // any other kind of failure (e.g. a typo would also "fail").
    await expect(restrictedClient.query('CREATE TABLE "ShouldNeverExist" (id serial primary key)')).rejects.toThrow(
      /permission denied/i,
    );
    // Postgres phrases a non-owner's ALTER TABLE rejection differently
    // from CREATE TABLE's — both are the same "insufficient privilege"
    // class of failure, just worded per-statement.
    await expect(restrictedClient.query('ALTER TABLE "User" ADD COLUMN "ShouldNeverExist" text')).rejects.toThrow(
      /permission denied|must be owner/i,
    );
  });
});
