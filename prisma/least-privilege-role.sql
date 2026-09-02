-- security-spec.md §7 (closing spec-review.md's least-privilege-role
-- follow-up) — a dedicated Postgres role for the application's *runtime*
-- connection (DATABASE_URL), scoped to CRUD only. It cannot create,
-- alter, or drop any table/schema, so a compromised DATABASE_URL cannot
-- do schema-level damage. Migrations (DIRECT_URL) keep using the
-- Neon-provisioned owner role, which retains full DDL rights.
--
-- Run once per database (idempotent via IF NOT EXISTS / the ON CONFLICT-
-- style catches below), then set a runtime DATABASE_URL to use this
-- role's credentials. Re-run the GRANT block after any migration adds a
-- new table — Postgres does not retroactively apply
-- ALTER DEFAULT PRIVILEGES to tables that already existed when it was
-- set, only to ones created afterward, so this file also sets default
-- privileges for future tables to keep this a one-time-per-schema-change
-- concern rather than a per-table one going forward.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime WITH LOGIN PASSWORD :'app_runtime_password';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;

-- CRUD only — no CREATE/ALTER/DROP/TRUNCATE.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Applies the same grants to any table/sequence a future migration adds,
-- without needing to re-run this script by hand every time (still safe
-- to re-run it anyway).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

-- Explicitly no CREATE on the schema or database — this is what makes
-- CREATE TABLE/ALTER TABLE/DROP TABLE fail over this role's connection
-- (verified by tests/integration/least-privilege-role.test.ts).
REVOKE CREATE ON SCHEMA public FROM app_runtime;
