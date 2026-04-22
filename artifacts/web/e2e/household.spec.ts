import { test, expect } from "@playwright/test";
import { signInAsTestUser, API_BASE } from "./helpers/auth";

test.describe("Household Management", () => {
  test("household page loads after sign-in", async ({ page }) => {
    await signInAsTestUser(page);
    await page.goto("/household");

    await expect(page.locator("body")).not.toContainText("Unexpected error");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("GET /api/households/mine requires authentication", async ({ page }) => {
    const resp = await page.request.get(`${API_BASE}/api/households/mine`);
    expect(resp.status()).toBe(401);
  });

  test("POST invite requires authentication", async ({ page }) => {
    const resp = await page.request.post(
      `${API_BASE}/api/households/mine/members/invite`,
      { data: { email: "test@example.com", role: "other" } },
    );
    expect(resp.status()).toBe(401);
  });
});
