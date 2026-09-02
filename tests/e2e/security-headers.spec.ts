import { test, expect } from "@playwright/test";

/**
 * security-spec.md §3/§17, Phase 15 acceptance criteria — "Security
 * headers are present and correctly configured on every response,
 * verified via an automated header-inspection test." Checks a public
 * page, an authenticated workspace page, and robots.txt (deliberately
 * exempt from the auth proxy but still expected to carry these headers
 * independently, per security-spec.md §17's note).
 */
test.describe("Security headers (security-spec.md §3)", () => {
  function assertBaselineHeaders(headers: Record<string, string>, path: string) {
    expect(headers["x-content-type-options"], `${path}: X-Content-Type-Options`).toBe("nosniff");
    expect(headers["x-frame-options"], `${path}: X-Frame-Options`).toBe("DENY");
    expect(headers["referrer-policy"], `${path}: Referrer-Policy`).toBe("strict-origin-when-cross-origin");
  }

  test("the public landing page carries the baseline headers plus a nonce-based CSP", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    assertBaselineHeaders(headers, "/");
    expect(headers["content-security-policy"], "/: Content-Security-Policy").toMatch(/default-src 'self'/);
    expect(headers["content-security-policy"]).toMatch(/frame-ancestors 'none'/);
  });

  test("the login page carries the baseline headers plus a nonce-based CSP", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    assertBaselineHeaders(headers, "/login");
    expect(headers["content-security-policy"], "/login: Content-Security-Policy").toMatch(/default-src 'self'/);
  });

  test("an authenticated workspace page carries the same baseline headers", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "a.whitfield@investigations.example");
    await page.fill("#password", "Demo!Pass2026");
    await Promise.all([page.waitForURL("**/dashboard"), page.click('button[type="submit"]:has-text("Sign in")')]);

    // A fresh full navigation (not the login redirect's own response,
    // which is a Server Action's RSC-flavored redirect rather than a
    // plain page GET) guarantees a normal document response to inspect.
    const response = await page.goto("/dashboard");
    expect(response).not.toBeNull();
    assertBaselineHeaders(response!.headers(), "/dashboard");
  });

  test("robots.txt is exempt from the auth proxy but still carries the baseline headers independently", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    assertBaselineHeaders(response.headers(), "/robots.txt");
  });
});
