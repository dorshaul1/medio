import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "Taste Reel One/Two/Three" (movies 560-562) are used exclusively by
// this file — see the fixture comments by MOVIE_TASTE_1 in
// tmdb-mock-server.ts. Taste is Stats' second tab (`/stats?tab=taste`)
// — see docs/taste.md.

test.describe("empty Taste", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ retries: 2 });

  test("a brand-new user sees a restrained empty state, not empty charts", async ({ page }) => {
    const email = `taste-empty-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Taste Empty");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

    await page.goto("/stats?tab=taste");
    await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
    await expect(page.getByText("No stats yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Discover" })).toBeVisible();
    await expect(page.getByRole("region", { name: /Genres/ })).toHaveCount(0);
  });

  test("the old /library/taste route redirects to the Taste tab", async ({ page }) => {
    const email = `taste-redirect-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Taste Redirect");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

    await page.goto("/library/taste");
    await expect(page).toHaveURL("/stats?tab=taste");
    await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
  });
});

test.describe
  .serial("a developing Taste profile", () => {
    test("watching titles surfaces genre insight, Favorite Director, and Favorite Actor", async ({
      page,
    }) => {
      await page.goto("/movies/560");
      await expect(page.getByRole("heading", { level: 1, name: "Taste Reel One" })).toBeVisible();
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      await page.goto("/movies/561");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      await page.goto("/movies/562");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      await page.goto("/stats?tab=taste");

      const genreSection = page.getByRole("region", { name: /Genres/ });
      await expect(genreSection.getByText("Drama")).toBeVisible();

      const peopleSection = page.getByRole("region", { name: "Favorite people" });
      await expect(peopleSection.getByRole("link", { name: /David Fincher/ })).toBeVisible();
      await expect(peopleSection.getByRole("link", { name: /Edward Norton/ })).toBeVisible();

      await peopleSection.getByRole("link", { name: /David Fincher/ }).click();
      await expect(page).toHaveURL("/people/7467");
      await expect(page.getByRole("heading", { level: 1, name: "David Fincher" })).toBeVisible();

      await page.goto("/stats?tab=taste");
      await page
        .getByRole("region", { name: "Favorite people" })
        .getByRole("link", { name: /Edward Norton/ })
        .click();
      await expect(page).toHaveURL("/people/819");
      await expect(page.getByRole("heading", { level: 1, name: "Edward Norton" })).toBeVisible();
    });

    test("rewatching a movie surfaces a rewatch insight with real artwork", async ({ page }) => {
      await page.goto("/movies/560");
      await page.getByRole("button", { name: /^Watched$/ }).click();
      await page.getByRole("menuitem", { name: "Watch again" }).click();
      await expect(page.getByRole("button", { name: "Watched 2 times" })).toBeVisible();

      await page.goto("/stats?tab=taste");
      const rewatchSection = page.getByRole("region", { name: "Rewatching" });
      await expect(rewatchSection.getByRole("link", { name: /Taste Reel One/ })).toBeVisible();
      await expect(rewatchSection.getByText("Watched 2 times")).toBeVisible();
    });

    test("Taste updates after a new watch and persists on reload", async ({ page }) => {
      await page.goto("/stats?tab=taste");
      await expect(page.getByText("You watch mostly Drama.")).toBeVisible();

      await page.reload();
      await expect(page.getByText("You watch mostly Drama.")).toBeVisible();
    });

    test("the Stats tab switch reaches Taste and keeps Stats active in primary nav", async ({
      page,
    }) => {
      await page.goto("/stats");
      await expect(page.getByRole("navigation", { name: "Stats section" })).toBeVisible();
      await page
        .getByRole("navigation", { name: "Stats section" })
        .getByRole("link", { name: "Taste" })
        .click();
      await expect(page).toHaveURL(/\/stats\?.*tab=taste/);
      await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Stats" }),
      ).toHaveAttribute("aria-current", "page");
    });

    test("a developing Taste profile is readable on a touch-sized viewport", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/stats?tab=taste");

      await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
      await expect(page.getByRole("region", { name: /Genres/ })).toBeVisible();
      await expect(page.getByRole("region", { name: "Favorite people" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Rewatching" })).toBeVisible();
    });
  });
