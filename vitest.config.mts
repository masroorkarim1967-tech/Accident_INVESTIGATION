import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest config (technical-architecture.md §12). `environment: "node"` is
 * the default for unit/validation/integration tests (no DOM needed, faster);
 * component tests opt into a DOM per-file via a
 * `// @vitest-environment jsdom` docblock at the top of the file, rather
 * than paying jsdom's startup cost for every test in the suite.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // tests/e2e/ is Playwright's territory (playwright.config.ts), run via
    // `npm run test:e2e` — Vitest's default include glob would otherwise
    // also pick up *.spec.ts files there and fail trying to execute
    // Playwright's test.describe() outside Playwright's own runner.
    exclude: ["**/node_modules/**", "tests/e2e/**"],
    // Integration tests (tests/integration/**) exercise real Server
    // Actions against a live Postgres connection, some via several
    // sequential round-trips in one test — comfortably past Vitest's 5s
    // default under real network latency. Unit/validation tests never
    // approach this, so raising the default globally costs nothing there.
    testTimeout: 15000,
    // Every integration test file shares one live database and cleans up
    // its own fixtures in `afterAll` by a "TEST-FIXTURE-*" title prefix —
    // running files in parallel worker processes risks one file's cleanup
    // deleting another file's still-in-progress fixtures. Serializing file
    // execution trades some wall-clock time for that reliability; this is
    // also the properly conservative default until CI provisions a
    // dedicated ephemeral Neon branch per run (technical-architecture.md
    // §12) rather than every file sharing one branch.
    fileParallelism: false,
    // testing-spec.md §5: no numeric coverage threshold is mandated (the
    // §2 acceptance-criteria checklist is the completeness bar instead) —
    // this just enables reporting so CI can publish/inspect a coverage
    // artifact, not a pass/fail gate on a percentage.
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**", "components/**"],
      exclude: ["**/generated/**", "**/*.d.ts"],
    },
  },
});
