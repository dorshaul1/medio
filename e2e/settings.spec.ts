import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "Settings Reel One" (movie 570) and "Settings Watch" (show 590) are
// used exclusively by this file — see the fixture comments by
// MOVIE_SETTINGS_1 in tmdb-mock-server.ts. Every test here mutates
// shared preference state for the suite's one authenticated user, so
// this runs as one serial sequence rather than independent tests that
// could interleave.

test.describe
  .serial("Settings", () => {
    test("is reachable from the account control, and never marks a primary destination active", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("link", { name: "Settings" }).click();

      await expect(page).toHaveURL(/\/settings\/appearance$/);
      await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      const nav = page.getByRole("navigation", { name: "Primary" });
      for (const label of ["Home", "Discover", "Library", "Stats"]) {
        await expect(nav.getByRole("link", { name: label })).not.toHaveAttribute("aria-current");
      }
    });

    test("switching category updates the URL and the active category", async ({ page }) => {
      await page.goto("/settings/appearance");
      await page.getByRole("link", { name: "Spoilers" }).click();

      await expect(page).toHaveURL(/\/settings\/spoilers$/);
      await expect(page.getByRole("link", { name: "Spoilers" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByRole("link", { name: "Appearance" })).not.toHaveAttribute(
        "aria-current",
      );
    });

    test("changing Theme applies immediately, with no reload, and persists on refresh", async ({
      page,
    }) => {
      await page.goto("/settings/appearance");

      await page.getByRole("radio", { name: "Dark" }).click();
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("radio", { name: "Dark", checked: true })).toBeVisible();

      await page.reload();
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("radio", { name: "Dark", checked: true })).toBeVisible();
    });

    test("Default Save destination changes where the quick-save action lands", async ({ page }) => {
      await page.goto("/settings/tracking");
      await page.getByRole("radio", { name: "Backlog" }).click();
      await expect(page.getByRole("radio", { name: "Backlog", checked: true })).toBeVisible();

      await page.goto("/movies/570");
      await expect(
        page.getByRole("heading", { level: 1, name: "Settings Reel One" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Save Settings Reel One to Backlog" }).click();

      await page.goto("/library?type=movie");
      const row = page
        .getByRole("listitem")
        .filter({ has: page.getByRole("link", { name: /Settings Reel One/ }) });
      await expect(row.getByText("Backlog")).toBeVisible();
    });

    test("Spoiler protection hides an unwatched episode's identity and overview, keeps a watched one visible, and allows a local reveal", async ({
      page,
    }) => {
      await page.goto("/settings/spoilers");
      await page.getByRole("radio", { name: "Strict" }).click();
      await expect(page.getByRole("radio", { name: "Strict", checked: true })).toBeVisible();

      await page.goto("/shows/590/seasons/1");

      // Episode 1: mark watched — Strict never hides a watched episode.
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(page.getByRole("heading", { name: "A Spoiler-Sensitive Title" })).toBeVisible();

      // Episode 2: unwatched — Strict hides the real title and overview.
      await expect(page.getByRole("heading", { name: "Episode 2" })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Another Spoiler-Sensitive Title" }),
      ).toHaveCount(0);
      await expect(page.getByText("Hidden by spoiler settings")).toBeVisible();

      // A local reveal only affects this row — never the global preference.
      await page.getByRole("button", { name: "Show details for episode 2" }).click();
      await expect(
        page.getByRole("heading", { name: "Another Spoiler-Sensitive Title" }),
      ).toBeVisible();
    });

    test("Reset preferences restores defaults, without touching watch history", async ({
      page,
    }) => {
      await page.goto("/settings/appearance");
      await page.getByRole("button", { name: "Reset preferences" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Reset preferences" }).click();

      await expect(page.getByRole("radio", { name: "System", checked: true })).toBeVisible();
      await expect(page.getByRole("radio", { name: "Comfortable", checked: true })).toBeVisible();

      // The movie saved to Backlog above is real watch/planning history,
      // not a preference — resetting preferences must never touch it.
      await page.goto("/library?type=movie");
      const row = page
        .getByRole("listitem")
        .filter({ has: page.getByRole("link", { name: /Settings Reel One/ }) });
      await expect(row.getByText("Backlog")).toBeVisible();
    });
  });

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Settings is reachable without becoming a sixth bottom-navigation destination", async ({
    page,
  }) => {
    await page.goto("/");

    const bottomNav = page.getByRole("navigation", { name: "Primary" });
    await expect(bottomNav.getByRole("link")).toHaveCount(4);

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings\/appearance$/);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  });
});
