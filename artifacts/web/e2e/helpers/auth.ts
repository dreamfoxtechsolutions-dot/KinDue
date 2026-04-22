import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "../.auth-state.json");

export const API_PORT = process.env.E2E_API_PORT || "8080";
export const API_BASE = `http://localhost:${API_PORT}`;

export function getTestEmail(): string {
  const raw = fs.readFileSync(STATE_FILE, "utf-8");
  return JSON.parse(raw).testEmail as string;
}

export async function signInAsTestUser(page: Page): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto("/");

  await page.waitForFunction(
    () => (window as any).Clerk !== undefined,
    { timeout: 20000 },
  );
  await page.waitForFunction(
    () => (window as any).Clerk?.loaded === true,
    { timeout: 20000 },
  );
  await page.waitForFunction(
    () => (window as any).Clerk?.client !== undefined,
    { timeout: 20000 },
  );

  const email = getTestEmail();
  await clerk.signIn({ page, emailAddress: email });

  await page.waitForFunction(
    () => (window as any).Clerk?.user !== null && (window as any).Clerk?.user !== undefined,
    { timeout: 20000 },
  );

  await page.goto("/");
  await page.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 10000 });
}
