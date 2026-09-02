import { defineConfig, devices } from "@playwright/test";

/**
 * E2E configuration (testing-spec.md §12). Requires a running application
 * server (`npm run dev` or `npm run build && npm run start`) pointed at a
 * migrated + seeded database — same DATABASE_URL/DIRECT_URL requirement as
 * the integration tests in tests/integration/ (see their
 * `describe.skipIf(!process.env.DATABASE_URL)` convention; there is no
 * equivalent conditional skip here since these are a separate `npx
 * playwright test` invocation, not part of `npm run test`). Full CI wiring
 * (a dedicated ephemeral database per run) is a Phase 14 concern per
 * technical-architecture.md §12 — this config is what a contributor or CI
 * job runs today, against a database they provision themselves.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // 1 retry locally too (not just in CI) — a long suite run against a
  // free-tier Neon dev branch occasionally hits a single slow query that
  // blows a 30s navigation timeout under sustained load (found during
  // Phase 15's full-suite verification); a retry absorbs that transient
  // latency without masking a genuine failure, which would fail again.
  retries: 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    navigationTimeout: 45000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
