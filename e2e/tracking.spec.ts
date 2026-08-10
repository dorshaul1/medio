import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts (see global-setup.ts
// and playwright.config.ts), never live TMDB. Each Playwright run signs up
// a brand-new user (see auth.setup.ts), so this suite always starts with a
// clean tracking history for these fixtures — no reset step needed.
//
// Movie and show tracking each mutate shared server state for the signed-in
// user, so each flow runs as one serial sequence rather than independent
// tests that could interleave with each other under full parallelism.

test.describe
  .serial("movie watch tracking", () => {
    test("mark watched, rewatch, and reload persistence", async ({ page }) => {
      await page.goto("/movies/551");

      await expect(page.getByRole("heading", { level: 1, name: "The Second Reel" })).toBeVisible();
      const markWatched = page.getByRole("button", { name: "Mark watched", exact: true });
      await expect(markWatched).toBeVisible();

      await markWatched.click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      await page.reload();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      // Rewatch — a second event, never a toggle.
      await page.getByRole("button", { name: /^Watched$/ }).click();
      await page.getByRole("menuitem", { name: "Watch again" }).click();
      await expect(page.getByRole("button", { name: "Watched 2 times" })).toBeVisible();

      await page.reload();
      await expect(page.getByRole("button", { name: "Watched 2 times" })).toBeVisible();
    });
  });

test.describe
  .serial("show and episode watch tracking", () => {
    test("start watching, track episodes across seasons, on hold, and reload persistence", async ({
      page,
    }) => {
      await page.goto("/shows/1399");

      const startWatching = page.getByRole("button", { name: "Start watching" });
      await expect(startWatching).toBeVisible();
      await startWatching.click();
      await expect(page.getByText("Watching", { exact: true })).toBeVisible();
      await expect(page.getByText("0 of 2 episodes", { exact: true })).toBeVisible();

      // Put the show on hold before logging any episodes.
      await page.getByRole("button", { name: "Tracking options" }).click();
      await page.getByRole("menuitem", { name: "On hold" }).click();
      await expect(page.getByText("On hold", { exact: true })).toBeVisible();

      // Mark an aired episode watched from the season page.
      await page.getByRole("link", { name: /Season 1/ }).click();
      await expect(page).toHaveURL(/\/shows\/1399\/seasons\/1$/);

      const markEpisode1 = page.getByRole("button", { name: "Mark episode 1 watched" });
      await expect(markEpisode1).toBeVisible();
      await markEpisode1.click();
      const unmarkEpisode1 = page.getByRole("button", { name: "Mark episode 1 as not watched" });
      await expect(unmarkEpisode1).toBeVisible();
      await expect(page.getByText("1 of 1 episode", { exact: true })).toBeVisible();

      // Clicking a watched episode again is a toggle — it unmarks the
      // episode entirely, never a second (rewatch) event and never an
      // "Undo" control.
      await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
      await unmarkEpisode1.click();
      await expect(markEpisode1).toBeVisible();
      await expect(page.getByText("0 of 1 episode", { exact: true })).toBeVisible();

      // Mark it watched again so the rest of this flow's progress
      // expectations hold.
      await markEpisode1.click();
      await expect(unmarkEpisode1).toBeVisible();
      await expect(page.getByText("1 of 1 episode", { exact: true })).toBeVisible();

      // Watching an episode always resumes tracking — the show is no longer
      // on hold, and there's still an unwatched aired episode left.
      await page.getByRole("link", { name: "Winter's Watch" }).click();
      await expect(page).toHaveURL(/\/shows\/1399$/);
      await expect(page.getByText("Watching", { exact: true })).toBeVisible();
      await expect(page.getByText("1 of 2 episodes", { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText("Watching", { exact: true })).toBeVisible();
      await expect(page.getByText("1 of 2 episodes", { exact: true })).toBeVisible();

      // Mark the show's other aired episode — now every aired episode is
      // watched and the show has ended, so tracking resolves to Completed.
      await page.getByRole("link", { name: /Season 2/ }).click();
      await expect(page).toHaveURL(/\/shows\/1399\/seasons\/2$/);
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      await page.getByRole("link", { name: "Winter's Watch" }).click();
      await expect(page.getByText("Completed", { exact: true })).toBeVisible();
      await expect(page.getByText("2 of 2 episodes", { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText("Completed", { exact: true })).toBeVisible();
      await expect(page.getByText("2 of 2 episodes", { exact: true })).toBeVisible();
    });

    test("an unaired episode has no watch control", async ({ page }) => {
      await page.goto("/shows/1399/seasons/2");

      await expect(page.getByRole("heading", { name: "A Future Episode" })).toBeVisible();
      await expect(page.getByText("Upcoming")).toBeVisible();
      await expect(page.getByRole("button", { name: /Mark episode 2 watched/ })).toHaveCount(0);
    });
  });

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("marking a movie watched works on a touch-sized viewport", async ({ page }) => {
    await page.goto("/movies/550");

    const markWatched = page.getByRole("button", { name: "Mark watched", exact: true });
    await expect(markWatched).toBeVisible();
    await markWatched.click();
    await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
  });
});
