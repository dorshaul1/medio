import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "The Sixth Reel" (movie 555), "Eighth Watch" (show 1404), and "The
// Seventh Reel" (movie 556, mobile-only) are used exclusively by this
// file — other specs already mutate watch/tracking state for the other
// fixture titles, so Diary's own coverage needs fixtures no other spec
// touches to run safely under full parallelism.

function diaryRow(page: import("@playwright/test").Page, titlePattern: RegExp) {
  return page.getByRole("listitem").filter({ hasText: titlePattern });
}

test.describe("empty Diary", () => {
  // A genuinely fresh user, not the suite's shared authenticated session
  // — the empty state must reflect a user with truly no viewing history.
  test.use({ storageState: { cookies: [], origins: [] } });
  // Same reasoning as e2e/library.spec.ts's own empty-state describe:
  // this is a second full sign-up under full local parallelism, which
  // can occasionally trip Better Auth's rate limiting.
  test.describe.configure({ retries: 2 });

  test("a brand-new user sees an intentional empty state, and Library stays the active nav destination", async ({
    page,
  }) => {
    const email = `diary-empty-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Diary Empty");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

    await page.goto("/library/diary");
    await expect(page.getByRole("heading", { level: 1, name: "Diary" })).toBeVisible();
    await expect(page.getByText("Nothing watched yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Discover" })).toBeVisible();

    // Diary is nested under /library — Library remains the active
    // primary nav destination even though the page itself reads "Diary".
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Library" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

// One ordered sequence against the same fixtures (movie 555 / show
// 1404) — mixed history, rewatch, filtering, edit, and delete all build
// on the state the previous step left behind, the same reasoning
// e2e/library.spec.ts's own `.serial` blocks use. Nested describes still
// run in declaration order inside a `.serial` parent.
test.describe
  .serial("Diary history lifecycle", () => {
    test("a movie watch, an episode watch, and a movie rewatch appear in one correct chronology", async ({
      page,
    }) => {
      await page.goto("/movies/555");
      await expect(page.getByRole("heading", { level: 1, name: "The Sixth Reel" })).toBeVisible();
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      await page.goto("/shows/1404/seasons/1");
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      await page.goto("/library/diary");
      const movieRow = diaryRow(page, /The Sixth Reel/);
      const episodeRow = diaryRow(page, /Eighth Watch/);
      await expect(movieRow).toBeVisible();
      await expect(episodeRow).toBeVisible();
      await expect(episodeRow.getByText("S1 E1")).toBeVisible();

      // Rewatch the movie — a genuine second event, not an overwrite.
      await page.goto("/movies/555");
      await page.getByRole("button", { name: /^Watched$/ }).click();
      await page.getByRole("menuitem", { name: "Watch again" }).click();
      await expect(page.getByRole("button", { name: "Watched 2 times" })).toBeVisible();

      await page.goto("/library/diary");
      const movieRows = diaryRow(page, /The Sixth Reel/);
      await expect(movieRows).toHaveCount(2);
      // The two real, independent viewings are never collapsed into one
      // "watched 2 times" summary row in the timeline itself.
      await expect(movieRows.filter({ hasText: "2nd watch" })).toHaveCount(1);
    });

    test("Movies/TV filters narrow the timeline, and the choice survives a reload", async ({
      page,
    }) => {
      await page.goto("/library/diary?type=movies");
      const movieRow = diaryRow(page, /The Sixth Reel/);
      await expect(movieRow.first()).toBeVisible();
      await expect(diaryRow(page, /Eighth Watch/)).toHaveCount(0);

      await page.reload();
      await expect(page.getByRole("link", { name: "Movies", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(movieRow.first()).toBeVisible();

      await page.goto("/library/diary?type=tv");
      await expect(diaryRow(page, /Eighth Watch/)).toBeVisible();
      await expect(diaryRow(page, /The Sixth Reel/)).toHaveCount(0);
    });

    test("editing a viewing's date moves it, and the correction survives a reload", async ({
      page,
    }) => {
      await page.goto("/library/diary");
      const row = diaryRow(page, /Eighth Watch/);
      await row.getByRole("button", { name: /More actions/ }).click();
      await page.getByRole("menuitem", { name: "Edit watch date" }).click();

      const dialog = page.getByRole("dialog", { name: "Edit watch date" });
      const input = dialog.getByLabel("Watched on");
      await input.fill("2020-03-15");
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(dialog).not.toBeVisible();

      await expect(page.getByRole("heading", { name: "March 15, 2020" })).toBeVisible();

      await page.reload();
      await expect(page.getByRole("heading", { name: "March 15, 2020" })).toBeVisible();
    });

    test("deleting one rewatch removes only that viewing — the other remains, and Movie Details agrees", async ({
      page,
    }) => {
      await page.goto("/library/diary?type=movies");
      const rows = diaryRow(page, /The Sixth Reel/);
      await expect(rows).toHaveCount(2);

      const rewatchRow = rows.filter({ hasText: "2nd watch" });
      await rewatchRow.getByRole("button", { name: /More actions/ }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      const dialog = page.getByRole("dialog", { name: "Delete this entry?" });
      await dialog.getByRole("button", { name: "Delete" }).click();
      await expect(dialog).not.toBeVisible();

      await expect(rows).toHaveCount(1);
      await expect(rows.filter({ hasText: "2nd watch" })).toHaveCount(0);

      // The remaining single viewing is really reflected on Movie Details
      // too, not just removed from the Diary row.
      await page.goto("/movies/555");
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();
      await expect(page.getByRole("button", { name: "Watched 2 times" })).toHaveCount(0);
    });

    test("deleting an Episode entry updates Season progress elsewhere", async ({ page }) => {
      await page.goto("/library/diary?type=tv");
      const row = diaryRow(page, /Eighth Watch/);
      await row.getByRole("button", { name: /More actions/ }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      const dialog = page.getByRole("dialog", { name: "Delete this entry?" });
      await dialog.getByRole("button", { name: "Delete" }).click();
      await expect(dialog).not.toBeVisible();
      await expect(diaryRow(page, /Eighth Watch/)).toHaveCount(0);

      await page.goto("/shows/1404/seasons/1");
      await expect(page.getByRole("button", { name: "Mark episode 1 watched" })).toBeVisible();
    });
  });

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Diary is usable on a touch-sized viewport, including editing", async ({ page }) => {
    await page.goto("/movies/556");
    await page.getByRole("button", { name: "Mark watched", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

    await page.goto("/library/diary");
    await expect(page.getByRole("heading", { level: 1, name: "Diary" })).toBeVisible();
    const row = diaryRow(page, /The Seventh Reel/).first();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: /More actions/ }).click();
    await page.getByRole("menuitem", { name: "Edit watch date" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit watch date" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();
  });
});
