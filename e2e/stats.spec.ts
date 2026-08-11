import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "Taste Reel One/Two/Three" (movies 560-562) are used exclusively by
// this file — see the fixture comments by MOVIE_TASTE_1 in
// tmdb-mock-server.ts. No other spec rates anything, so every rating-
// based assertion below (genre averages, Favorite Director/Actor) is
// exact and unaffected by other files' watch/tracking activity for the
// suite's shared authenticated user.

test.describe("empty Stats", () => {
  // A genuinely fresh user — same reasoning as e2e/library.spec.ts's own
  // empty-state coverage: the shared authenticated session may already
  // have watch history by the time this runs.
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
    // No section headings at all — never an empty chart/stat grid.
    await expect(page.getByRole("heading", { name: "Genres" })).toHaveCount(0);
  });
});

test.describe
  .serial("a developing Stats profile", () => {
    test("watching and rating titles surfaces a genre insight, a Favorite Director, and a Favorite Actor", async ({
      page,
    }) => {
      // Three distinct watched titles — the minimum for a genre insight
      // to clear Taste's total-title threshold (see docs/stats.md).
      await page.goto("/movies/560");
      await expect(page.getByRole("heading", { level: 1, name: "Taste Reel One" })).toBeVisible();
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
      await page.getByRole("radio", { name: "Excellent" }).click();
      await expect(page.getByRole("radio", { name: "Excellent", checked: true })).toBeVisible();

      await page.goto("/movies/561");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
      await page.getByRole("radio", { name: "Good" }).click();
      await expect(page.getByRole("radio", { name: "Good", checked: true })).toBeVisible();

      await page.goto("/movies/562");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      await page.goto("/stats");

      const genreSection = page.getByRole("region", { name: "Genres" });
      // Drama clears both the "most watched" and "highest rated" lists
      // here (both rated titles are Drama) — legitimately two matches,
      // not a bug, so `.first()` rather than an ambiguous exact lookup.
      await expect(genreSection.getByText("Drama").first()).toBeVisible();
      // Both rated Drama titles average (5 + 3) / 2 = 4.0.
      await expect(genreSection.getByText("4.0 avg")).toBeVisible();

      const peopleSection = page.getByRole("region", { name: "Favorite people" });
      await expect(peopleSection.getByRole("link", { name: /David Fincher/ })).toBeVisible();
      await expect(peopleSection.getByRole("link", { name: /Edward Norton/ })).toBeVisible();

      // Favorite Director links to the real Person page.
      await peopleSection.getByRole("link", { name: /David Fincher/ }).click();
      await expect(page).toHaveURL("/people/7467");
      await expect(page.getByRole("heading", { level: 1, name: "David Fincher" })).toBeVisible();

      // Favorite Actor links to the real Person page.
      await page.goto("/stats");
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

      await page.goto("/stats");
      const rewatchSection = page.getByRole("region", { name: "Rewatching" });
      await expect(rewatchSection.getByRole("link", { name: /Taste Reel One/ })).toBeVisible();
      await expect(rewatchSection.getByText("Watched 2 times")).toBeVisible();
    });

    test("changing a rating updates Stats immediately, and it persists on reload", async ({
      page,
    }) => {
      await page.goto("/stats");
      await expect(page.getByRole("region", { name: "Genres" }).getByText("4.0 avg")).toBeVisible();

      await page.goto("/movies/561");
      await page.getByRole("radio", { name: "Excellent" }).click();
      await expect(page.getByRole("radio", { name: "Excellent", checked: true })).toBeVisible();

      await page.goto("/stats");
      // Both Drama titles now rate 5 — average 5.0.
      await expect(page.getByRole("region", { name: "Genres" }).getByText("5.0 avg")).toBeVisible();

      await page.reload();
      await expect(page.getByRole("region", { name: "Genres" }).getByText("5.0 avg")).toBeVisible();
    });

    // Appended to the same serial sequence (rather than a separate
    // `test.describe` with its own `viewport` fixture) so this runs
    // *after* the mutations above and actually exercises a developing
    // profile on a touch-sized viewport, not an empty one — ordering
    // between separate top-level `describe` blocks isn't guaranteed
    // under `fullyParallel`.
    test("a developing Stats profile is readable on a touch-sized viewport", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/stats");

      await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Genres" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Favorite people" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Rewatching" })).toBeVisible();
    });
  });

// A fresh, otherwise-empty account gives full deterministic control over
// which years have real history — the shared-session tests above can't
// guarantee that (other spec files' own fixtures also share that
// session). Reuses the same TMDB fixtures as above; safe, since Stats'
// own per-user isolation means a different signed-up user's watch events
// never interact with the shared session's.
test.describe
  .serial("date ranges and comparison", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test.describe.configure({ retries: 2 });

    test("range chips, a sparse year, and Compare's plain-language summary", async ({ page }) => {
      const email = `stats-range-${Date.now()}@example.com`;
      await page.goto("/sign-up");
      await page.getByLabel("Name").fill("Stats Range");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

      // Three distinct watched titles — the minimum for a genre insight to
      // clear Taste's total-title threshold (see docs/stats.md).
      await page.goto("/movies/560");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
      await page.goto("/movies/561");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
      await page.goto("/movies/562");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      const currentYear = new Date().getUTCFullYear();

      await page.goto("/stats");
      const rangeNav = page.getByRole("navigation", { name: "Date range" });
      await expect(rangeNav.getByRole("link", { name: "All time" })).toHaveAttribute(
        "aria-current",
        "true",
      );
      await expect(
        rangeNav.getByRole("link", { name: String(currentYear), exact: true }),
      ).toBeVisible();

      // Switching to the current year keeps showing the same real history.
      await rangeNav.getByRole("link", { name: String(currentYear), exact: true }).click();
      await expect(page).toHaveURL(`/stats?range=${currentYear}`);
      await expect(
        page.getByRole("navigation", { name: "Date range" }).getByRole("link", {
          name: String(currentYear),
          exact: true,
        }),
      ).toHaveAttribute("aria-current", "true");
      await expect(page.getByRole("region", { name: "Genres" })).toBeVisible();

      // A year with no history at all is a sparse state, not the app's
      // generic "No stats yet." empty state — the range control stays
      // usable so the user can navigate straight back out.
      const sparseYear = currentYear - 5;
      await page.goto(`/stats?range=${sparseYear}`);
      await expect(page.getByText(`Nothing watched in ${sparseYear}.`)).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Date range" })).toBeVisible();
      await expect(page.getByText("No stats yet.")).toHaveCount(0);

      // Compare surfaces a plain-language fact, never a raw percentage.
      await page.goto(`/stats?range=${currentYear}&compare=1`);
      const comparison = page.getByRole("region", { name: `Compared to ${currentYear - 1}` });
      await expect(comparison).toBeVisible();
      await expect(comparison.getByText(/You watched more Movies/)).toBeVisible();
    });
  });
