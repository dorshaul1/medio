import { expect, test } from "@playwright/test";

test.describe("empty Stats", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ retries: 2 });

  test("a brand-new user sees a restrained empty state, not empty charts", async ({ page }) => {
    const email = `stats-empty-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Stats Empty");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

    await page.goto("/stats");
    await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
    await expect(page.getByText("No stats yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Discover" })).toBeVisible();
    await expect(page.getByRole("region", { name: /Genres/ })).toHaveCount(0);
  });
});

test.describe
  .serial("date ranges, tabs, and comparison", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test.describe.configure({ retries: 2 });

    test("defaults to All time, three static range chips, and Compare's plain-language summary", async ({
      page,
    }) => {
      const email = `stats-range-${Date.now()}@example.com`;
      await page.goto("/sign-up");
      await page.getByLabel("Name").fill("Stats Range");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

      await page.goto("/movies/560");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
      await page.goto("/movies/561");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
      await page.goto("/movies/562");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      await page.goto("/stats");
      const rangeNav = page.getByRole("navigation", { name: "Date range" });
      // Default landing range is All time (the Default Stats range
      // preference's own product default — see docs/stats.md).
      await expect(rangeNav.getByRole("link", { name: "All time" })).toHaveAttribute(
        "aria-current",
        "true",
      );
      await expect(page.getByText("Your viewing history.")).toBeVisible();
      // Only the three static chips, in this order — no per-year-number
      // chip, no "More".
      const chips = rangeNav.getByRole("link");
      await expect(chips).toHaveCount(3);
      await expect(chips.nth(0)).toHaveText("All time");
      await expect(chips.nth(1)).toHaveText("This year");
      await expect(chips.nth(2)).toHaveText("This month");
      await expect(page.getByRole("button", { name: "More" })).toHaveCount(0);

      const currentYear = new Date().getUTCFullYear();
      await rangeNav.getByRole("link", { name: "This year" }).click();
      await expect(page).toHaveURL(`/stats?range=${currentYear}`);
      await expect(page.getByText(`What you watched in ${currentYear}.`)).toBeVisible();

      const sparseYear = currentYear - 5;
      await page.goto(`/stats?range=${sparseYear}`);
      await expect(page.getByText(`Nothing watched in ${sparseYear}.`)).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Date range" })).toBeVisible();
      await expect(page.getByText("No stats yet.")).toHaveCount(0);

      await page.goto("/stats?range=last12months&compare=1");
      const comparison = page.getByRole("region", { name: "Compared to the previous 12 months" });
      await expect(comparison).toBeVisible();
    });

    test("switching to the Taste tab preserves the selected range", async ({ page }) => {
      await page.goto("/stats?range=all");
      await page
        .getByRole("navigation", { name: "Stats section" })
        .getByRole("link", { name: "Taste" })
        .click();
      await expect(page).toHaveURL("/stats?range=all&tab=taste");
      await expect(page.getByText("You watch mostly Drama.")).toBeVisible();

      await page
        .getByRole("navigation", { name: "Stats section" })
        .getByRole("link", { name: "Overview" })
        .click();
      await expect(page).toHaveURL("/stats?range=all");
    });

    test("changing the range while on the Taste tab keeps Taste active — never silently falls back to Overview", async ({
      page,
    }) => {
      await page.goto("/stats?tab=taste");
      await expect(page.getByText("You watch mostly Drama.")).toBeVisible();

      const currentYear = new Date().getUTCFullYear();
      await page
        .getByRole("navigation", { name: "Date range" })
        .getByRole("link", { name: "This year" })
        .click();

      await expect(page).toHaveURL(`/stats?range=${currentYear}&tab=taste`);
      await expect(page.getByText("You watch mostly Drama.")).toBeVisible();
    });

    test("Stats viewing rhythm is readable on a touch-sized viewport", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/stats?range=all");

      await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Date range" })).toBeVisible();
    });
  });
