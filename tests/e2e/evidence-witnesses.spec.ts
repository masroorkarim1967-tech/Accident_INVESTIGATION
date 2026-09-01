import { test, expect } from "@playwright/test";

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

async function createInvestigation(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/investigations/new");
  await page.fill("#title", `E2E-EVIDENCE-${Date.now()}`);
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

test.describe("Witnesses (FR-019/FR-020)", () => {
  test("add a witness, and the 'no witnesses' toggle is blocked while one exists", async ({ page }) => {
    await login(page);
    const investigationId = await createInvestigation(page);

    await page.goto(`/investigations/${investigationId}/witnesses`);
    await page.click('button:has-text("+ Add Witness")');
    await page.fill("#name", "Capt. E2E Witness");
    await page.selectOption("#witnessType", "Crew");
    await page.fill("#statementSummary", "Observed the aircraft depart the runway centerline on landing.");
    await page.selectOption("#reliabilityAssessment", "High");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/witnesses") && res.request().method() === "POST"),
      page.locator('form:has(#name) button[type="submit"]').click(),
    ]);
    await expect(page.getByText("Capt. E2E Witness")).toBeVisible();

    // The empty-state checkbox only renders with zero witnesses recorded —
    // with one present, it should not be offered at all.
    await expect(page.getByText("No witnesses were identified for this occurrence")).not.toBeVisible();
  });

  test("acknowledging 'no witnesses' on an empty investigation shows the acknowledgment text (EC-09)", async ({
    page,
  }) => {
    await login(page);
    const investigationId = await createInvestigation(page);

    await page.goto(`/investigations/${investigationId}/witnesses`);
    await expect(page.getByText("No witnesses were identified for this occurrence")).toBeVisible();
    await page.click('text="No witnesses were identified for this occurrence"');
    await expect(page.getByText("No witnesses recorded", { exact: true })).toBeVisible();
  });
});

test.describe("Evidence (FR-021-024)", () => {
  test("add evidence, upload an attachment, download it, then remove the item (cascade)", async ({ page }) => {
    await login(page);
    const investigationId = await createInvestigation(page);

    await page.goto(`/investigations/${investigationId}/evidence`);
    await page.click('button:has-text("+ Add Evidence")');
    await page.selectOption("#evidenceType", "Documents");
    await page.fill("#source", "E2E Test Source");
    await page.fill("#description", "A document logged during E2E verification.");
    await page.selectOption("#relevance", "High");
    await page.selectOption("#reliabilityAssessment", "High");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/evidence") && res.request().method() === "POST"),
      page.locator('form:has(#source) button[type="submit"]').click(),
    ]);
    await expect(page.getByText("A document logged during E2E verification.")).toBeVisible();

    // Upload a real attachment through the actual Route Handler.
    const sampleContent = "This is a fixture file used by the Phase 6 E2E attachment test.";
    const fileInput = page.locator('input[type="file"]');
    const [uploadResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/evidence/") && res.request().method() === "POST"),
      fileInput.setInputFiles({
        name: "sample.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(sampleContent),
      }),
    ]);
    expect(uploadResponse.status()).toBe(201);
    await expect(page.getByText("sample.txt")).toBeVisible();

    // Download round-trip: the link opens the Route Handler directly.
    const downloadHref = await page.getByText("sample.txt").getAttribute("href");
    expect(downloadHref).toMatch(/\/api\/evidence\/attachment\/\d+/);
    const downloadResponse = await page.request.get(downloadHref!);
    expect(downloadResponse.status()).toBe(200);
    expect(downloadResponse.headers()["content-type"]).toBe("text/plain");
    const body = await downloadResponse.text();
    expect(body).toBe(sampleContent);

    // Removing the evidence item cascades its attachment away too.
    await page.click('button:has-text("Remove")');
    await expect(page.getByText("A document logged during E2E verification.")).not.toBeVisible();
  });

  test("a disallowed file type is rejected before any bytes are persisted", async ({ page }) => {
    await login(page);
    const investigationId = await createInvestigation(page);

    await page.goto(`/investigations/${investigationId}/evidence`);
    await page.click('button:has-text("+ Add Evidence")');
    await page.selectOption("#evidenceType", "Other");
    await page.fill("#source", "Reject Test");
    await page.fill("#description", "Testing rejection of a disallowed file type.");
    await page.selectOption("#relevance", "Low");
    await page.selectOption("#reliabilityAssessment", "Low");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/evidence") && res.request().method() === "POST"),
      page.locator('form:has(#source) button[type="submit"]').click(),
    ]);

    await page.locator('input[type="file"]').setInputFiles({
      name: "disallowed.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("MZ fake executable bytes"),
    });
    await expect(page.getByText(/File type not accepted/)).toBeVisible();
    await expect(page.getByText("No files attached.")).toBeVisible();
  });
});
