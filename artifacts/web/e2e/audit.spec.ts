import { test, expect } from "@playwright/test";
import { signInAsTestUser, API_BASE } from "./helpers/auth";

test.describe("Audit Log", () => {
  test("audit page loads after sign-in", async ({ page }) => {
    await signInAsTestUser(page);
    await page.goto("/audit");

    await expect(page.locator("body")).not.toContainText("Unexpected error");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("GET /api/audit requires authentication", async ({ page }) => {
    const resp = await page.request.get(`${API_BASE}/api/audit`);
    expect(resp.status()).toBe(401);
  });
});
