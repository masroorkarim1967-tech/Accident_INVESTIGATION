import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * product-spec.md §11.6 — the UI/report label layer must never present a
 * recorded conclusion as "Root Cause," "Confirmed Cause," or
 * "Determination" without the "Potential" / "Investigator Assessment"
 * qualifiers. Scans JSX text content (the substring between `>` and `<`)
 * in every Root Cause Analysis-facing source file — not the whole file,
 * so a JSDoc comment or FR-038 citation referencing "Root Cause" by name
 * (this file's own docblock included) is never a false positive.
 */

const ROOT_DIR = path.resolve(__dirname, "../..");
// Route-group directory names contain parentheses, which Node's glob
// syntax treats as special characters — walked manually instead of via
// a glob pattern to sidestep that entirely.
const TARGET_DIRS = [
  "components/rootcause",
  "app/(workspace)/investigations/[id]/root-causes",
  "app/(workspace)/investigations/[id]/five-whys",
];

function jsxTextNodes(source: string): string[] {
  const matches = source.matchAll(/>([^<>{]*)</g);
  return [...matches].map((m) => m[1]).filter((text) => text.trim().length > 0);
}

function collectTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectFiles(): string[] {
  return TARGET_DIRS.flatMap((dir) => collectTsxFiles(path.join(ROOT_DIR, dir)));
}

describe("Root Cause non-declaration wording (product-spec.md §11.6)", () => {
  const files = collectFiles();

  it("found at least one Root Cause Analysis source file to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("never renders 'Root Cause' as JSX text without a preceding 'Potential'", () => {
    // "Root Cause Analysis" is the module/page name itself (ui-spec.md
    // §14's own section heading, and the pre-existing SectionStepper
    // label) — naming the analytical activity, not presenting a specific
    // recorded conclusion as fact, so it's exempted from the check.
    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const rawText of jsxTextNodes(source)) {
        const text = rawText.replace(/Root Cause Analysis/g, "");
        if (/\bRoot Cause\b/.test(text) && !/\bPotential Root Cause\b/.test(text)) {
          violations.push(`${path.relative(ROOT_DIR, file)}: "${text.trim()}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("never renders 'Confirmed Cause' or 'Determination' as JSX text", () => {
    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const text of jsxTextNodes(source)) {
        if (/\bConfirmed Cause\b/i.test(text) || /\bDetermination\b/i.test(text)) {
          violations.push(`${path.relative(ROOT_DIR, file)}: "${text.trim()}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("uses the 'Investigator Assessment' heading somewhere in the Root Cause card", () => {
    const source = readFileSync(path.join(ROOT_DIR, "components/rootcause/RootCausePanel.tsx"), "utf8");
    expect(source).toMatch(/Investigator Assessment/);
  });
});
