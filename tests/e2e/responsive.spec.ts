import { test, expect } from "@playwright/test";

/**
 * testing-spec.md §4.9 (TS-042-045) — ui-spec.md §6 breakpoints.
 */

const INVESTIGATOR = { email: "r.okafor@investigations.example", password: "Demo!Pass2026" };

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#email", INVESTIGATOR.email);
  await page.fill("#password", INVESTIGATOR.password);
  await Promise.all([page.waitForURL("**/dashboard"), page.click('button[type="submit"]:has-text("Sign in")')]);
}

async function createInvestigation(page: import("@playwright/test").Page, title: string) {
  await page.goto("/investigations/new");
  await page.fill("#title", title);
  await page.fill("#occurrenceDate", "2026-03-15");
  await page.fill("#reporterName", "Responsive Test Reporter");
  await Promise.all([
    page.waitForURL(/\/investigations\/\d+$/),
    page.click('button[type="submit"]:has-text("Create Investigation")'),
  ]);
  return page.url().match(/\/investigations\/(\d+)/)?.[1];
}

test.describe("Responsive UI (TS-042-045)", () => {
  test("Investigation Detail at 375px: the Section Stepper renders as a 'Jump to section' dropdown, not a left rail (TS-042)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page);
    const id = await createInvestigation(page, `TEST-FIXTURE-responsive-${Date.now()}`);
    await page.goto(`/investigations/${id}`);

    const jumpDropdown = page.getByRole("combobox", { name: /jump to section/i }).or(page.getByLabel(/jump to section/i));
    await expect(jumpDropdown).toBeVisible();

    const leftRailNav = page.locator('nav[aria-label="Investigation sections"]');
    await expect(leftRailNav).not.toBeVisible();
  });

  test("Hazard Analysis at 375px with a hazard scored: the risk-matrix grid is reachable via horizontal scroll inside its own container (TS-043)", async ({
    page,
  }) => {
    await login(page);
    const id = await createInvestigation(page, `TEST-FIXTURE-responsive-${Date.now()}`);
    await page.goto(`/investigations/${id}/hazards`);
    await page.click('button:has-text("+ Add Hazard")');
    await page.fill("#description", "Fixture hazard for responsive check.");
    await page.selectOption("#hazardCategory", "Environmental");
    await page.selectOption("#initialLikelihood", "Likely");
    await page.selectOption("#initialSeverity", "Major");
    await page.locator('form:has(#description) button[type="submit"]').click();
    await expect(page.getByText("Fixture hazard for responsive check.")).toBeVisible();

    await page.setViewportSize({ width: 375, height: 800 });
    const grid = page.locator('[data-testid="risk-matrix-grid"]');
    await expect(grid).toBeVisible();
    // scrollWidth (unclamped content width) must stay at the grid's full
    // legible size — its own container scrolls horizontally rather than
    // the grid's cells being visually squeezed smaller than the viewport.
    const contentWidth = await grid.evaluate((el) => el.scrollWidth);
    expect(contentWidth).toBeGreaterThanOrEqual(280);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, "the page body itself must not overflow — only the grid's own container scrolls").toBeLessThanOrEqual(
      clientWidth + 1,
    );
  });

  // TS-044 as literally specified ("the right rail collapses into a
  // toggleable drawer") does not apply to this build: ui-spec.md's
  // three-column desktop layout (stepper + main + right rail) was
  // implemented as a simpler two-column one (stepper + main, with the
  // "quick facts" content ui-spec.md describes for the right rail inlined
  // directly into the main column's fact-card grid instead) — there is no
  // separate right-rail element anywhere in the app to collapse. What's
  // still genuinely testable at the 768-1199px tablet breakpoint is the
  // same no-overflow guarantee TS-045 checks at other widths.
  test("Investigation Detail at 900px renders without horizontal body overflow (TS-044, adapted — no right rail exists in this build)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await login(page);
    const id = await createInvestigation(page, `TEST-FIXTURE-responsive-${Date.now()}`);
    await page.goto(`/investigations/${id}`);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("no page in ui-spec.md's page list produces horizontal scroll of the page body at 375/768/1024/1440px (TS-045)", async ({
    page,
  }) => {
    // 4 viewports x 5 paths = 20 full navigations in one test, several to
    // the heaviest page in the app (Investigation Detail runs 4 queries
    // in parallel) — comfortably past a single 30s budget under real
    // network latency, independent of the config-level per-navigation
    // timeout.
    test.slow();
    await login(page);
    const id = await createInvestigation(page, `TEST-FIXTURE-responsive-${Date.now()}`);
    const paths = ["/dashboard", "/investigations", "/action-tracker", `/investigations/${id}`, `/investigations/${id}/occurrence`];

    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of paths) {
        await page.goto(path);
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth, `${path} at ${width}px should not overflow horizontally`).toBeLessThanOrEqual(clientWidth + 1);
      }
    }
  });
});
