import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "Ninth Watch" (show 1600), "Tenth Watch" (show 1601), and "The Eighth
// Reel" (movie 600) are used exclusively by this file — see the fixture
// comments by SHOW_CALENDAR_1 in tmdb-mock-server.ts. Their air/release
// dates are computed relative to the real current date at server
// startup, so this suite stays correct regardless of when it actually
// runs. Tests mutate shared tracking/planning/preference state for the
// suite's one authenticated user, so this runs as one serial sequence.
test.describe
  .serial("Calendar", () => {
    test("a Caught Up show's next aired episode appears as 'New' automatically, and quick-tracking clears it", async ({
      page,
    }) => {
      await page.goto("/shows/1600");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Start watching" }).click();
      await page.getByRole("button", { name: "Tracking options" }).waitFor({ timeout: 10000 });

      await page.goto("/shows/1600/seasons/1");
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      await page.goto("/calendar");
      await expect(page.getByRole("heading", { level: 1, name: "Calendar" })).toBeVisible();

      const today = page.getByRole("heading", { name: "Today" }).locator("..");
      await expect(today.getByText("Ninth Watch")).toBeVisible();
      await expect(today.getByText(/New/)).toBeVisible();

      // Also upcoming, in a later bucket — a distinct event, not merged
      // with today's.
      const thisWeek = page.getByRole("heading", { name: "This week" }).locator("..");
      await expect(thisWeek.getByText("Ninth Watch")).toBeVisible();
      await expect(thisWeek.getByText(/S1 E3/)).toBeVisible();

      // Quick-tracking directly from Calendar — no navigation away, no
      // hard reload, and the row is gone once it resolves.
      await page.getByRole("button", { name: "Mark episode 2 watched" }).click();
      await expect(page.getByRole("heading", { name: "Today" })).not.toBeVisible();
    });

    test("a Backlog show's premiere and a Watchlist movie's release both appear with the right labels", async ({
      page,
    }) => {
      await page.goto("/shows/1601");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("button", { name: "Watchlist" })).toBeVisible();
      await page.getByRole("button", { name: "Watchlist" }).click();
      await page.getByRole("menuitem", { name: /Move to Backlog/ }).click();
      await expect(page.getByRole("button", { name: "Backlog" })).toBeVisible();

      await page.goto("/movies/600");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("button", { name: "Watchlist" })).toBeVisible();

      await page.goto("/calendar");
      const thisWeek = page.getByRole("heading", { name: "This week" }).locator("..");

      const showRow = thisWeek.getByText("Tenth Watch").locator("..");
      await expect(showRow.getByText(/Backlog/)).toBeVisible();
      await expect(showRow.getByText(/Series premiere/)).toBeVisible();

      const movieRow = thisWeek.getByText("The Eighth Reel").locator("..");
      await expect(movieRow.getByText(/Watchlist/)).toBeVisible();
    });

    test("Home's Calendar entry point links to Calendar and shows a weekly count", async ({
      page,
    }) => {
      await page.goto("/");
      const entryPoint = page.getByRole("link", { name: /Calendar/ });
      await expect(entryPoint).toBeVisible();
      await expect(entryPoint).toHaveAttribute("href", "/calendar");
      await expect(entryPoint).toHaveText(/this week/);
    });

    test("Strict spoiler protection hides an unwatched upcoming episode's identity on Calendar, with a local reveal", async ({
      page,
    }) => {
      await page.goto("/settings/spoilers");
      await page.getByRole("radio", { name: "Strict" }).click();
      await expect(page.getByRole("radio", { name: "Strict", checked: true })).toBeVisible();

      await page.goto("/calendar");
      const thisWeek = page.getByRole("heading", { name: "This week" }).locator("..");
      const ninthWatchRow = thisWeek.getByText("Ninth Watch").locator("..");

      // The show's own identity always stays visible; only the specific
      // episode's title is spoiler-sensitive.
      await expect(ninthWatchRow.getByText("The Reckoning")).not.toBeVisible();
      const reveal = page.getByRole("button", {
        name: "Show details for Ninth Watch episode 3",
      });
      await expect(reveal).toBeVisible();

      await reveal.click();
      await expect(page.getByText("The Reckoning")).toBeVisible();
    });
  });

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Calendar's view/filter toggles and agenda remain usable on a touch-sized viewport", async ({
    page,
  }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { level: 1, name: "Calendar" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Upcoming" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "TV" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Movies" })).toBeVisible();

    await page.getByRole("link", { name: "Calendar" }).click();
    await expect(page).toHaveURL(/view=calendar/);
  });
});
