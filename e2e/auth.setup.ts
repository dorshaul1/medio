import { expect, test as setup } from "@playwright/test";

const STORAGE_STATE = "playwright/.auth/user.json";

// Runs once before the authenticated project (see playwright.config.ts) —
// creates a fresh account and saves the resulting session so the rest of
// the suite (navigation/theme/smoke specs) doesn't have to sign up itself.
// A unique email each run means this never collides with a previous run
// against a persistent local database.
setup("authenticate", async ({ page }) => {
  const email = `e2e-shell-${Date.now()}@example.com`;

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Shell User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
