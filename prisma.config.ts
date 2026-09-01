import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Plain `dotenv/config` only loads `.env`. README.md/technical-architecture.md
// §11 document `.env.local` as where local dev values go (matching Next.js's
// own convention) — without this, the Prisma CLI would silently never see a
// contributor's local database credentials. Mirrors Next.js's precedence:
// `.env.local` overrides `.env` when both are present.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

// Prisma 7: the CLI (migrate, studio, db seed) connects using this file, not
// a datasource.url in schema.prisma. Uses DIRECT_URL (Neon's unpooled
// connection string) because schema-changing operations need a direct
// connection, per technical-architecture.md §5.1 — the same reasoning that
// previously justified `directUrl` in the schema file. The application's
// own runtime connection (lib/db.ts) uses the pooled DATABASE_URL instead,
// via a driver adapter.
//
// Uses `process.env` directly rather than the `env()` config helper: `env()`
// throws at config-load time if the variable is unset, which breaks
// commands that don't need a live connection at all (`prisma format`,
// `prisma generate`) when no .env.local exists yet.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 moved seed configuration here from package.json's "prisma"
    // field (which is no longer read) — discovered during Phase 4 testing
    // when `prisma db seed` reported "No seed command configured" despite
    // that now-dead package.json field still being present.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
