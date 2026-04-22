import { test, expect } from "@playwright/test";
import { signInAsTestUser, API_BASE } from "./helpers/auth";

test.describe("Triage", () => {
  test("triage page loads after sign-in", async ({ page }) => {
    await signInAsTestUser(page);
    await page.goto("/triage");

    await expect(page.locator("body")).not.toContainText("Unexpected error");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("GET /api/triage requires authentication", async ({ page }) => {
    const resp = await page.request.get(`${API_BASE}/api/triage`);
    expect(resp.status()).toBe(401);
  });

  test("POST /api/triage/run requires authentication", async ({ page }) => {
    const resp = await page.request.post(`${API_BASE}/api/triage/run`);
    expect(resp.status()).toBe(401);
  });
});
