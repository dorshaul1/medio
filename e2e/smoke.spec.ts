import { expect, test } from "@playwright/test";

test("loads the home page inside the application shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Home | MEDIO");
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
});

test("exposes an accessible main landmark and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
});
