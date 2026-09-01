import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Minimal Vitest config — just enough for this phase's unit tests
 * (technical-architecture.md §12). Full CI wiring/coverage gates are
 * Phase 14's job.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
  },
});
