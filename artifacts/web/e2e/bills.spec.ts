import { test, expect } from "@playwright/test";
import { signInAsTestUser, API_BASE } from "./helpers/auth";

test.describe("Bills", () => {
  test("bills page loads after sign-in", async ({ page }) => {
    await signInAsTestUser(page);
    await page.goto("/bills");

    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("body")).not.toContainText("Unexpected error");

    const heading = page.getByRole("heading", { name: /bills/i }).first();
    await expect(heading).toBeVisible();
  });

  test("bills page loads and shows page content without crashing", async ({ page }) => {
    await signInAsTestUser(page);
    await page.goto("/bills");

    await expect(page.locator("body")).not.toContainText("Unexpected error");
    await expect(page.locator("body")).not.toContainText("Something went wrong");

    const url = page.url();
    expect(url).not.toContain("500");
  });

  test("GET /api/bills requires authentication", async ({ page }) => {
    const resp = await page.request.get(`${API_BASE}/api/bills`);
    expect(resp.status()).toBe(401);
  });

  test("GET /api/households/mine requires authentication", async ({ page }) => {
    const resp = await page.request.get(`${API_BASE}/api/households/mine`);
    expect(resp.status()).toBe(401);
  });
});
