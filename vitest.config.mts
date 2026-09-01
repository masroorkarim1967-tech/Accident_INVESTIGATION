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
  },
});
