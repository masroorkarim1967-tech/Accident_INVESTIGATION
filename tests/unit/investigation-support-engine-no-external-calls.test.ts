import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * assistance-engine.md §2's non-negotiable constraint: no external AI/ML
 * API call, of any kind, anywhere in the engine. Static check per
 * implementation-plan.md Phase 11's Acceptance Criteria — no `fetch(` call
 * anywhere under lib/services/investigationSupportEngine/, since a purely
 * local rule-based engine has no legitimate reason to call `fetch` at all,
 * relative or otherwise.
 */
describe("Investigation Support Engine has no external network calls (assistance-engine.md §2)", () => {
  const engineDir = join(process.cwd(), "lib", "services", "investigationSupportEngine");

  it("contains no `fetch(` call in any engine source file", () => {
    const files = readdirSync(engineDir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const contents = readFileSync(join(engineDir, file), "utf-8");
      expect(contents, `${file} must not call fetch()`).not.toMatch(/\bfetch\s*\(/);
    }
  });
});
