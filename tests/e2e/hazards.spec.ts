import { test, expect } from "@playwright/test";

const INVESTIGATION_MANAGER = {
  email: "m.delacroix@investigations.example",
  password: "Demo!Pass2026",
};

const ADMINISTRATOR = {
  email: "a.whitfield@investigations.example",
  password: "Demo!Pass2026",
};

const VIEWER = {
  email: "viewer@investigations.example",
  password: "Demo!Pass2026",
};

async function login(page: import("@playwright/test").Page, credentials: { email: string; password: string }) {
  await page.goto("/login");
  await page.fill("#email", credentials.email);
  await page.fill("#password", credentials.password);
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.click('button[type="submit"]:has-text("Sign in")'),
  ]);
}

async function createInvestigation(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/investigations/new");
  await page.fill("#title", `E2E-HAZARD-${Date.now()}`);
  await page.fill("#occurrenceDate", "2026-03-15");
  await page.fill("#reporterName", "E2E Test Reporter");
  await Promise.all([
    page.waitForURL(/\/investigations\/\d+$/),
    page.click('button[type="submit"]:has-text("Create Investigation")'),
  ]);
  const investigationId = page.url().match(/\/investigations\/(\d+)/)?.[1];
  if (!investigationId) throw new Error("Investigation ID not found in URL");
  return investigationId;
}

test.describe("Hazard Analysis (FR-029/FR-030/FR-068)", () => {
  test("add a hazard, record residual risk, then remove it", async ({ page }) => {
    await login(page, INVESTIGATION_MANAGER);
    const investigationId = await createInvestigation(page);

    await page.goto(`/investigations/${investigationId}/hazards`);
    await expect(page.getByText("No hazards identified yet.")).toBeVisible();

    await page.click('button:has-text("+ Add Hazard")');
    await page.fill("#description", "Wet runway with degraded braking action.");
    await page.selectOption("#hazardCategory", "Environmental");
    await page.selectOption("#initialLikelihood", "Likely");
    await page.selectOption("#initialSeverity", "Major");
    await page.locator('form:has(#description) button[type="submit"]').click();
    await expect(page.getByText("Wet runway with degraded braking action.")).toBeVisible();
    // 16 = Likely(4) x Major(4), resolves to High per the seeded default bands.
    await expect(page.getByText("16 · High")).toBeVisible();

    // Residual Risk, saved independently of Initial Risk.
    await page.selectOption("select[name='residualLikelihood']", "Unlikely");
    await page.selectOption("select[name='residualSeverity']", "Minor");
    await page.click('button:has-text("Save Residual Risk")');
    await expect(page.getByText("4 · Low")).toBeVisible();

    await page.click('button:has-text("Remove")');
    await expect(page.getByText("Wet runway with degraded braking action.")).not.toBeVisible();
    await expect(page.getByText("No hazards identified yet.")).toBeVisible();
  });

  test("a residual score higher than the initial score saves with a non-blocking warning (FR-068)", async ({ page }) => {
    await login(page, INVESTIGATION_MANAGER);
    const investigationId = await createInvestigation(page);

    await page.goto(`/investigations/${investigationId}/hazards`);
    await page.click('button:has-text("+ Add Hazard")');
    await page.fill("#description", "Minor housekeeping issue.");
    await page.selectOption("#hazardCategory", "Organizational");
    await page.selectOption("#initialLikelihood", "Rare");
    await page.selectOption("#initialSeverity", "Negligible");
    await page.locator('form:has(#description) button[type="submit"]').click();
    await expect(page.getByText("Minor housekeeping issue.")).toBeVisible();

    await page.selectOption("select[name='residualLikelihood']", "AlmostCertain");
    await page.selectOption("select[name='residualSeverity']", "Catastrophic");
    await page.click('button:has-text("Save Residual Risk")');

    await expect(page.getByText(/higher than initial risk/)).toBeVisible();
    await expect(page.getByText("25 · Critical")).toBeVisible();
  });
});

test.describe("Risk Band Configuration (FR-069)", () => {
  test("an Administrator can reach Risk Band Configuration from the header Settings link", async ({ page }) => {
    await login(page, ADMINISTRATOR);
    await page.click('a:has-text("Settings")');
    await expect(page).toHaveURL(/\/settings\/risk-bands$/);
    await expect(page.getByRole("heading", { name: "Risk Band Configuration" })).toBeVisible();
  });

  test("a non-Administrator is denied access to Risk Band Configuration (server-enforced)", async ({ page }) => {
    await login(page, VIEWER);
    const response = await page.goto("/settings/risk-bands");
    expect(response?.status()).toBe(404);
  });
});
