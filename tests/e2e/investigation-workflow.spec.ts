import { test, expect } from "@playwright/test";

/**
 * Golden-path E2E coverage (testing-spec.md §12) for everything currently
 * built (implementation-plan.md Phases 1-5): login, investigation creation,
 * the Occurrence Details workflow (Narrative, Classification with the
 * rule-based suggestion engine, Actual/Potential Outcome risk computation,
 * Persons Involved, Immediate Actions), and Aircraft/Flight/Location.
 *
 * Requires a running app server (npm run dev, or npm run build && npm run
 * start) pointed at a migrated + seeded database — see playwright.config.ts.
 * The credentials below are the publicly documented demo accounts
 * (README.md's Database Setup section, prisma/seed.ts) — fictional
 * accounts on a fictional dataset, not a real secret.
 */

const INVESTIGATION_MANAGER = {
  email: "m.delacroix@investigations.example",
  password: "Demo!Pass2026",
};

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#email", INVESTIGATION_MANAGER.email);
  await page.fill("#password", INVESTIGATION_MANAGER.password);
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.click('button[type="submit"]:has-text("Sign in")'),
  ]);
}

test.describe("Public landing page", () => {
  test("shows the required disclaimers and does not force a login redirect", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Educational / Demonstration System").first()).toBeVisible();
    await expect(page.getByText("Uses simulated aviation data")).toBeVisible();
    await expect(page.getByText(/Not a substitute for official aviation investigation/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
  });

  test("an authenticated visitor is sent straight to the workspace, not shown the landing page again", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("Investigation workflow (golden path)", () => {
  test("login, create an investigation, and complete the Occurrence Details workflow", async ({ page }) => {
    await login(page);

    // Create
    await page.goto("/investigations/new");
    await page.fill("#title", `E2E-${Date.now()} Runway Excursion`);
    await page.fill("#occurrenceDate", "2026-03-15");
    await page.fill("#reporterName", "E2E Test Reporter");
    await Promise.all([
      page.waitForURL(/\/investigations\/\d+$/),
      page.click('button[type="submit"]:has-text("Create Investigation")'),
    ]);
    const investigationId = page.url().match(/\/investigations\/(\d+)/)?.[1];
    expect(investigationId).toBeTruthy();

    // Narrative
    await page.goto(`/investigations/${investigationId}/occurrence`);
    await page.fill("#occurrenceTimeUtc", "14:30");
    await page.fill("#briefDescription", "Aircraft departed runway during landing rollout.");
    await page.selectOption("#phaseOfFlight", "Landing");
    await page.fill(
      "#narrativeDescription",
      "During landing rollout in wet conditions, the aircraft experienced a runway excursion, departing the runway surface onto the grass shoulder before coming to a stop.",
    );
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/occurrence") && res.request().method() === "POST"),
      page.click('button:has-text("Save")'),
    ]);

    // Classification — rule-based suggestion, explicit accept required
    await page.click('button[role="tab"]:has-text("Classification")');
    await page.click('button:has-text("Suggest Classification")');
    await expect(page.getByText("Investigation Support · Suggested Classification")).toBeVisible();
    await page.click('button:has-text("Accept")');
    await expect(page.locator("#occurrenceCategory")).toHaveValue("AircraftIncident");
    await page.selectOption("#occurrenceSubcategoryId", { label: "Runway Excursion" });
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/occurrence") && res.request().method() === "POST"),
      page.click('button:has-text("Save Classification")'),
    ]);

    // Outcome — verifies the risk engine's computed Severity/Risk/Priority
    await page.selectOption("#actualOutcomeSeverity", "Minor");
    await page.fill("#actualOutcomeDescription", "Minor scrapes to landing gear, no injuries.");
    await page.selectOption("#potentialOutcomeSeverity", "Catastrophic");
    await page.fill(
      "#potentialOutcomeDescription",
      "Under slightly different conditions this could have resulted in a catastrophic loss of control.",
    );
    await page.selectOption("#likelihoodOfRecurrence", "Likely");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/occurrence") && res.request().method() === "POST"),
      page.click('button:has-text("Save Outcome")'),
    ]);
    // Likely x Catastrophic = 20 -> Critical band; severity = the more
    // severe of the two outcomes (Catastrophic) -> Immediate priority.
    // Matched against the RiskBadge/PriorityBadge's exact rendered text
    // (not a bare substring) — the occurrence taxonomy includes a real
    // subcategory named "...(Flight-Critical)", which a loose "Critical"
    // text match would also match ambiguously.
    await expect(page.getByText("20 · Critical")).toBeVisible();
    await expect(page.locator("span", { hasText: /^Immediate$/ })).toBeVisible();

    // Persons Involved
    await page.click('button[role="tab"]:has-text("Persons Involved")');
    await page.click('button:has-text("+ Add Person")');
    await page.fill("#name", "Capt. E2E Pilot");
    await page.selectOption("#roleType", "PIC");
    await page.selectOption("#injuryLevel", "None");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/occurrence") && res.request().method() === "POST"),
      page.locator('form:has(#name) button[type="submit"]').click(),
    ]);
    await expect(page.getByText("Capt. E2E Pilot")).toBeVisible();

    // Immediate Actions — including the date-ordering rule (FR-025)
    await page.click('button[role="tab"]:has-text("Immediate Actions")');
    await page.click('button:has-text("+ Add Immediate Action")');
    await page.fill("#description", "Runway inspected and closed for foreign object debris check.");
    await page.fill("#takenBy", "Airport Operations");
    await page.fill("#occurredAt", "2026-03-15T14:35");
    await page.selectOption("#actionType", "Safety");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/occurrence") && res.request().method() === "POST"),
      page.locator('form:has(#description) button[type="submit"]').click(),
    ]);
    await expect(page.getByText("Runway inspected")).toBeVisible();

    // Aircraft & Flight
    await page.goto(`/investigations/${investigationId}/aircraft-flight`);
    await page.fill("#registration", "G-E2ETST");
    await page.fill("#manufacturer", "Aeroventure");
    await page.fill("#model", "AV-320");
    await page.fill("#operatorName", "Skylark Air");
    await page.selectOption("#damageLevel", "Minor");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/aircraft-flight") && res.request().method() === "POST"),
      page.click('button:has-text("Save")'),
    ]);
    await expect(page.locator("#registration")).toHaveValue("G-E2ETST");

    // Regression: overview page still renders after all the above
    await page.goto(`/investigations/${investigationId}`);
    await expect(page.locator("body")).toContainText("Runway Excursion");
  });
});
