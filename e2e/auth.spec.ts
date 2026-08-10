import { expect, test } from "@playwright/test";

function uniqueUser() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: "E2E Test User",
    email: `e2e-${id}@example.com`,
    password: "correct horse battery staple 1",
  };
}

test("full auth lifecycle: sign up, use the app, sign out, blocked again", async ({ page }) => {
  const user = uniqueUser();

  // 1. An unauthenticated visitor requesting a protected route is
  // redirected to sign-in.
  await page.goto("/discover");
  await expect(page).toHaveURL(/\/sign-in$/);

  // 2. Navigate to create account.
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);

  // 3. Create the account.
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();

  // 4. Lands in the authenticated application.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

  // Already-authenticated visitors don't see auth screens.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/$/);

  // 5. Authenticated user can navigate protected routes.
  await page.getByRole("link", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole("heading", { level: 1, name: "Discover" })).toBeVisible();

  // 6. Sign out.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  // 7 & 8. Protected routes are blocked again after sign-out.
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("sign in with an existing account", async ({ page }) => {
  const user = uniqueUser();

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
});

test("sign-in shows an error for invalid credentials", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password-entirely");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Not getByRole("alert") — Next.js's own route announcer also has
  // role="alert", so that locator resolves to two elements here.
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});
