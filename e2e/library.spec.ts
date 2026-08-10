import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "The Third Reel" (movie 552) and "Second Season Watch" (show 1400) are
// used exclusively by this file — e2e/tracking.spec.ts already mutates
// watch/tracking state for the other fixture titles, so Library's own
// planning-flow coverage needs fixtures no other spec touches to run
// safely under full parallelism.
//
// The movie and show flows below run in different `describe.serial`
// blocks, which Playwright can run concurrently with each other (only
// tests *within* one block are guaranteed ordered) — both write to the
// same shared Library page for the suite's one authenticated user, so
// every Library-page assertion is scoped to the specific item's own row,
// never a bare page-wide text match that a concurrent block's row could
// also satisfy.

function libraryRow(page: import("@playwright/test").Page, titlePattern: RegExp) {
  return page.getByRole("listitem").filter({ has: page.getByRole("link", { name: titlePattern }) });
}

test.describe("empty Library", () => {
  // A genuinely fresh user, not the suite's shared authenticated session
  // (which other specs may have already added tracking/planning data
  // for by the time this runs) — the empty state must reflect a user
  // with truly no personal media yet.
  test.use({ storageState: { cookies: [], origins: [] } });
  // This is the one spec in the suite that performs a second full sign-up
  // (auth.setup.ts already does the first) — under full local parallelism
  // (uncapped worker count; see playwright.config.ts's comment on this
  // same class of issue) the two concurrent sign-ups can occasionally trip
  // Better Auth's own rate limiting for the shared localhost origin,
  // surfacing as a generic "Something went wrong" on the sign-up form
  // itself, not a real product defect. A scoped retry absorbs that.
  test.describe.configure({ retries: 2 });

  test("a brand-new user sees an intentional empty state", async ({ page }) => {
    const email = `library-empty-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Library Empty");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

    await page.goto("/library");
    await expect(page.getByText("Nothing here yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Discover" })).toBeVisible();
  });
});

test.describe
  .serial("movie planning flow", () => {
    test("Watchlist -> Backlog -> Watched, reflected in Library", async ({ page }) => {
      await page.goto("/movies/552");
      await expect(page.getByRole("heading", { level: 1, name: "The Third Reel" })).toBeVisible();

      // One click saves straight to Watchlist — the common default path,
      // no menu in the way (see docs/library.md, "Quick tracking").
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("button", { name: "Watchlist" })).toBeVisible();

      await page.goto("/library?type=movie");
      const row = libraryRow(page, /The Third Reel/);
      await expect(row).toBeVisible();
      await expect(row.getByText("Watchlist")).toBeVisible();

      // Move it to Backlog — click the current save state, then switch.
      await page.goto("/movies/552");
      await page.getByRole("button", { name: "Watchlist" }).click();
      await page.getByRole("menuitem", { name: /Move to Backlog/ }).click();
      await expect(page.getByRole("button", { name: "Backlog" })).toBeVisible();

      await page.goto("/library?type=movie");
      await expect(row.getByText("Backlog")).toBeVisible();

      // Mark it watched — planning clears automatically, and it now
      // belongs to history, not a future intent list.
      await page.goto("/movies/552");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);

      await page.goto("/library?type=movie&state=watched");
      await expect(row).toBeVisible();
      // Not `exact: true` — the row's detail line reads "1999 · Watched"
      // (year + state in one text node), so an exact match against
      // "Watched" alone would never match.
      await expect(row.getByText("Watched")).toBeVisible();

      // No longer appears under Watchlist.
      await page.goto("/library?type=movie&state=watchlist");
      await expect(page.getByText("Nothing here yet.")).toBeVisible();
    });
  });

test.describe
  .serial("show planning + tracking flow", () => {
    test("Backlog -> Start watching -> episode watched -> derived state in Library", async ({
      page,
    }) => {
      await page.goto("/shows/1400");
      await expect(
        page.getByRole("heading", { level: 1, name: "Second Season Watch" }),
      ).toBeVisible();

      // Save defaults to Watchlist in one click, then switch to Backlog —
      // same "click current save state to manage it" interaction as the
      // movie flow above.
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("button", { name: "Watchlist" })).toBeVisible();
      await page.getByRole("button", { name: "Watchlist" }).click();
      await page.getByRole("menuitem", { name: /Move to Backlog/ }).click();
      await expect(page.getByRole("button", { name: "Backlog" })).toBeVisible();

      await page.goto("/library?type=show");
      const row = libraryRow(page, /Second Season Watch/);
      await expect(row).toBeVisible();
      await expect(row.getByText("Backlog")).toBeVisible();

      // Start watching — planning clears automatically.
      await page.goto("/shows/1400");
      await page.getByRole("button", { name: "Start watching" }).click();
      await expect(page.getByRole("button", { name: "Tracking options" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);

      await page.goto("/library?type=show");
      await expect(row.getByText("Watching", { exact: true })).toBeVisible();

      // Mark the one aired episode watched — a fully-aired, ongoing
      // ("Returning Series") show with everything watched resolves to
      // Caught up, not Completed.
      await page.goto("/shows/1400/seasons/1");
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      await page.goto("/library?type=show");
      await expect(row.getByText("Caught up", { exact: true })).toBeVisible();
    });
  });

test.describe
  .serial("Library quick tracking", () => {
    test("next-episode Mark Watched, On Hold + Resume, and reaching Caught Up — all without opening Show Details", async ({
      page,
    }) => {
      await page.goto("/shows/1403");
      await expect(page.getByRole("heading", { level: 1, name: "Fifth Watch" })).toBeVisible();
      await page.getByRole("button", { name: "Start watching" }).click();
      await expect(page.getByRole("button", { name: "Tracking options" })).toBeVisible();

      // Mark the first episode from the season page — not part of what
      // this test is verifying (that's Library's own quick action below),
      // just getting the show into a real "one aired episode remains"
      // state to exercise it against.
      await page.goto("/shows/1403/seasons/1");
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      await page.goto("/library?type=show");
      const row = libraryRow(page, /Fifth Watch/);
      await expect(row).toBeVisible();
      await expect(row.getByText("S1 E2 next")).toBeVisible();

      // Put it On Hold from Show Details, then confirm Library exposes a
      // prominent Resume action rather than burying it in a menu.
      await page.goto("/shows/1403");
      await page.getByRole("button", { name: "Tracking options" }).click();
      await page.getByRole("menuitem", { name: "On hold" }).click();
      await expect(page.getByText("On hold", { exact: true })).toBeVisible();

      await page.goto("/library?type=show");
      await expect(row.getByText("On hold · S1 E2 next")).toBeVisible();
      await row.getByRole("button", { name: "Resume" }).click();
      await expect(row.getByText("S1 E2 next")).toBeVisible();
      await expect(row.getByRole("button", { name: "Resume" })).toHaveCount(0);

      // Mark the final aired episode watched directly from Library — no
      // Show Details/Season navigation at all — and land on Caught up
      // automatically.
      await row.getByRole("button", { name: "Mark Fifth Watch S1 E2 watched" }).click();
      await expect(row.getByText("Caught up", { exact: true })).toBeVisible();
      await expect(row.getByRole("button", { name: "Mark Fifth Watch S1 E2 watched" })).toHaveCount(
        0,
      );

      // The episode itself is really marked, not just the Library row —
      // confirmed from the season page too.
      await page.goto("/shows/1403/seasons/1");
      await expect(
        page.getByRole("button", { name: "Mark episode 2 as not watched" }),
      ).toBeVisible();
    });
  });

test.describe
  .serial("Library planned-movie quick tracking", () => {
    test("Mark Watched on a planned movie clears its planning state without opening Movie Details", async ({
      page,
    }) => {
      await page.goto("/movies/554");
      await expect(page.getByRole("heading", { level: 1, name: "The Fifth Reel" })).toBeVisible();
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("button", { name: "Watchlist" })).toBeVisible();

      await page.goto("/library?type=movie");
      const row = libraryRow(page, /The Fifth Reel/);
      await expect(row).toBeVisible();
      await expect(row.getByText("Watchlist")).toBeVisible();

      await row.getByRole("button", { name: "Mark The Fifth Reel watched" }).click();
      await expect(row.getByText("Watched")).toBeVisible();
      await expect(row.getByRole("button", { name: "Mark The Fifth Reel watched" })).toHaveCount(0);

      // Really watched, not just the Library row — the movie's own
      // control reflects it too.
      await page.goto("/movies/554");
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
    });
  });

test.describe("filter URL state", () => {
  test("filters survive refresh, and back/forward navigates between them", async ({ page }) => {
    await page.goto("/library?type=movie&state=watched");
    await expect(page.getByRole("combobox", { name: "State" })).toHaveText("Watched");

    await page.reload();
    await expect(page.getByRole("combobox", { name: "State" })).toHaveText("Watched");

    await page.goto("/library?type=show");
    await page.goBack();
    await expect(page).toHaveURL(/type=movie&state=watched/);
    await page.goForward();
    await expect(page).toHaveURL(/type=show/);
  });
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Library is usable on a touch-sized viewport", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("heading", { level: 1, name: "Library" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Movies" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shows" })).toBeVisible();
  });
});
