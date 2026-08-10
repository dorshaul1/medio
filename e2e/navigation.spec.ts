import { expect, test } from "@playwright/test";

test("primary navigation moves between destinations and reflects the active route", async ({
  page,
}) => {
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "Primary" });

  await nav.getByRole("link", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole("heading", { level: 1, name: "Discover" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Discover" })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Library" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { level: 1, name: "Library" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Stats" }).click();
  await expect(page).toHaveURL(/\/stats$/);
  await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Stats" })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bottom navigation reaches every destination", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover$/);
    await expect(page.getByRole("heading", { level: 1, name: "Discover" })).toBeVisible();
  });
});
