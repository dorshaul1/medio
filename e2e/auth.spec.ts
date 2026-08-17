import { expect, test } from "@playwright/test";

function uniqueUser() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: "E2E Test User",
    email: `e2e-${id}@example.com`,
    password: "correct horse battery staple 1",
  };
}

test("full auth lifecycle: sign up via a protected deep link, use the app, sign out, blocked again", async ({
  page,
}) => {
  const user = uniqueUser();

  // 1. An unauthenticated visitor requesting a protected route is
  // redirected to Sign In, preserving a safe return destination.
  await page.goto("/discover");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdiscover$/);

  // 2. Navigate to create account — the return destination survives the
  // switch to Sign Up too.
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=%2Fdiscover$/);

  // 3. Create the account.
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();

  // 4. Lands directly on the originally-requested route, not just Home.
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole("heading", { level: 1, name: "Discover" })).toBeVisible();

  // Already-authenticated visitors don't see auth screens (a fresh visit
  // with no `next` lands on Home).
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

  // 5. Log out (from Account — see docs/settings.md) — always returns to
  // the public Landing page, never back to Sign In.
  await page.getByRole("link", { name: /Open account settings for/ }).click();
  await expect(page).toHaveURL(/\/settings\/account$/);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /Everything you watch/ })).toBeVisible();

  // 6. Protected routes are blocked again after sign-out, with the
  // return destination preserved once more.
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Flibrary$/);
});

test("sign in with an existing account", async ({ page }) => {
  const user = uniqueUser();

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: /Open account settings for/ }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: "Log in" }).first().click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
});

test("sign-in shows an error for invalid credentials and preserves the entered email", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password-entirely");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Not getByRole("alert") — Next.js's own route announcer also has
  // role="alert", so that locator resolves to two elements here.
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByLabel("Email")).toHaveValue("nobody@example.com");
});

test("a malicious external return URL is never honored", async ({ page }) => {
  // Crafted by hand (not produced by the app itself) — this is exactly
  // the open-redirect attempt `src/lib/safe-redirect.ts` exists to stop.
  await page.goto("/sign-in?next=https://evil.example.com");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
});

test.describe("public Landing page", () => {
  // A genuinely fresh visitor, not the suite's shared authenticated session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a logged-out visitor sees Landing at '/', with working nav into auth", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Everything you watch/ }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Get started" }).first().click();
    await expect(page).toHaveURL(/\/sign-up$/);

    await page.goto("/");
    await page.getByRole("link", { name: "Log in" }).first().click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});
