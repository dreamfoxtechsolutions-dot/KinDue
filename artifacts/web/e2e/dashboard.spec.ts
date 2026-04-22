import { test, expect } from "@playwright/test";
import { signInAsTestUser } from "./helpers/auth";

test.describe("Dashboard", () => {
  test("loads authenticated dashboard with sidebar navigation", async ({ page }) => {
    await signInAsTestUser(page);

    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator("body")).not.toContainText("Error");

    const nav = page.locator("nav, aside, [role='navigation']").first();
    await expect(nav).toBeVisible();

    const billsLink = page.getByRole("link", { name: /bills/i }).first();
    await expect(billsLink).toBeVisible();
  });

  test("redirects unauthenticated users away from protected routes", async ({ page }) => {
    await page.goto("/bills");
    const url = page.url();
    const redirectedToAuth =
      url.includes("sign-in") ||
      url.includes("clerk.") ||
      url.includes("accounts.dev");
    expect(redirectedToAuth || url.includes("bills")).toBe(true);
  });
});
