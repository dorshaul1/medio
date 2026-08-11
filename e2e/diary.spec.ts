import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "The Sixth Reel" (movie 555), "Eighth Watch" (show 1404, two aired
// episodes in season 1), and "The Seventh Reel" (movie 556, mobile-only)
// are used exclusively by this file — other specs already mutate watch/
// tracking state for the other fixture titles, so Diary's own coverage
// needs fixtures no other spec touches to run safely under full
// parallelism. Diary's own per-user history isolation (every query is
// scoped by `user_id`) means the same TMDB fixture ids are also safe to
// reuse across *different signed-up users* within this same file (the
// "Month-scoped browsing" describe below) — only the shared session
// user's own event rows could ever collide with the other tests in this
// file, and each describe here uses either the shared session or its own
// fresh one, never both for the same title.

function diaryRow(page: import("@playwright/test").Page, titlePattern: RegExp) {
  return page.getByRole("listitem").filter({ hasText: titlePattern });
}

// Diary's month scope is a real UTC calendar month (see docs/diary.md,
// "Month navigation and timezone") — matches `DiaryMonthNav`'s own
// `formatDiaryMonthLabel`.
function monthLabel(offsetMonths: number): string {
  const now = new Date();
  const total = now.getUTCFullYear() * 12 + now.getUTCMonth() + offsetMonths;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

// A `YYYY-MM-DD` value for the 15th of (current local month + offset) —
// day 15 is always far enough from a month boundary that local-time and
// UTC agree on which month it falls in, regardless of the machine's own
// timezone (see `DiaryEntryMenu`'s edit dialog, which parses this text
// as a local calendar date via `parseDateInputValue`).
function localDateInput(offsetMonths: number, day = 15): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offsetMonths, day);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const paddedDay = String(target.getDate()).padStart(2, "0");
  return `${year}-${month}-${paddedDay}`;
}

// The date-group heading `groupDiaryEntries` renders for that same local
// date, once the browser is mounted and grouping by real local time.
function dateGroupHeading(offsetMonths: number, day = 15): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offsetMonths, day);
  const sameYear = target.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  }).format(target);
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
    // No history at all — month navigation would have nothing to browse,
    // so it's never rendered (see docs/diary.md, "Empty vs. sparse").
    await expect(page.getByRole("button", { name: "Next month" })).toHaveCount(0);

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
// 1404) — mixed history, rewatch, filtering, edit, delete, and session
// grouping all build on the state the previous step left behind, the
// same reasoning e2e/library.spec.ts's own `.serial` blocks use. Nested
// describes still run in declaration order inside a `.serial` parent.
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

    test("editing a viewing's date moves it to a different day group within the same month", async ({
      page,
    }) => {
      await page.goto("/library/diary");
      const row = diaryRow(page, /Eighth Watch/);
      await row.getByRole("button", { name: /More actions/ }).click();
      await page.getByRole("menuitem", { name: "Edit watch date" }).click();

      const dialog = page.getByRole("dialog", { name: "Edit watch date" });
      const input = dialog.getByLabel("Watched on");
      // Day 15 of the current local month — always on or before "today"
      // in practice (the 15th is never in the future relative to itself
      // arriving mid-month in any realistic run), so it survives the
      // dialog's own max-date constraint via the calendar widget too.
      await input.fill(localDateInput(0));
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(dialog).not.toBeVisible();

      const heading = dateGroupHeading(0);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();

      await page.reload();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
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

    test("sequential episodes watched close together form one binge session, still individually correctable", async ({
      page,
    }) => {
      await page.goto("/shows/1404/seasons/1");
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Mark episode 2 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 2 as not watched" }),
      ).toBeVisible();

      await page.goto("/library/diary");
      // Anchored to the start — once expanded, "More actions for Eighth
      // Watch, S1 E1"/"...S1 E2" would otherwise also loosely match
      // `/Eighth Watch/` and make this locator ambiguous.
      const sessionToggle = page.getByRole("button", { name: /^Eighth Watch/ });
      await expect(sessionToggle).toBeVisible();
      await expect(page.getByText("S1 E1-E2 · 2 episodes")).toBeVisible();
      await expect(sessionToggle).toHaveAttribute("aria-expanded", "false");

      await sessionToggle.click();
      await expect(sessionToggle).toHaveAttribute("aria-expanded", "true");
      // Each expanded episode's own link/menu carries a precise, unique
      // accessible name ("Eighth Watch, S1 E1"/"...S1 E2") — used
      // directly rather than filtering `<li>`s by text, since the
      // collapsed toggle's own summary text ("S1 E1-E2 · 2 episodes")
      // would otherwise ambiguously match the same substring too.
      const episodeOneLink = page.getByRole("link", { name: /S1 E1 · Episode 1/ });
      const episodeTwoLink = page.getByRole("link", { name: /S1 E2 · Episode 2/ });
      await expect(episodeOneLink).toBeVisible();
      await expect(episodeTwoLink).toBeVisible();

      // Opening an expanded episode still lands on its real Show/Season
      // context — grouping never changes where identity clicks go.
      await episodeOneLink.click();
      await expect(page).toHaveURL(/\/shows\/1404\/seasons\/1/);

      // Deleting one episode collapses the session back to a plain
      // single row — grouping is a live presentation, not a fixed shape.
      await page.goto("/library/diary");
      await page.getByRole("button", { name: /^Eighth Watch/ }).click();
      await page.getByRole("button", { name: "More actions for Eighth Watch, S1 E2" }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await page
        .getByRole("dialog", { name: "Delete this entry?" })
        .getByRole("button", { name: "Delete" })
        .click();

      await expect(page.getByRole("button", { name: /^Eighth Watch/ })).toHaveCount(0);
      await expect(diaryRow(page, /Eighth Watch/)).toBeVisible();
      await expect(page.getByText("S1 E1")).toBeVisible();
    });
  });

// A fresh, otherwise-empty account gives full deterministic control over
// what's in the current vs. previous month, which the shared-session
// tests above can't guarantee (other spec files' own fixtures also share
// that session — see the module comment). Reuses the same TMDB fixtures
// as above; safe, since Diary's own per-user isolation means a different
// signed-up user's watch events never interact with the shared session's.
test.describe
  .serial("Month-scoped browsing", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test.describe.configure({ retries: 2 });

    test("previous/next/Today navigation, a sparse month, and a cross-month edit", async ({
      page,
    }) => {
      const email = `diary-month-${Date.now()}@example.com`;
      await page.goto("/sign-up");
      await page.getByLabel("Name").fill("Diary Month");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

      await page.goto("/movies/555");
      await page.getByRole("button", { name: "Mark watched", exact: true }).click();
      await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

      await page.goto("/library/diary");
      await expect(page.getByRole("button", { name: monthLabel(0) })).toBeVisible();
      await expect(page.getByText("The Sixth Reel")).toBeVisible();
      // Already on the current month — no dead "Today" control, and "Next
      // month" is disabled (there's nothing beyond the current month).
      await expect(page.getByRole("link", { name: "Today" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Next month" })).toBeDisabled();

      // A brand-new account's previous month is guaranteed sparse.
      await page.getByRole("link", { name: "Previous month" }).click();
      await expect(page.getByRole("button", { name: monthLabel(-1) })).toBeVisible();
      await expect(page.getByText(`Nothing watched in ${monthLabel(-1)}.`)).toBeVisible();
      await expect(page.getByRole("link", { name: "Today" })).toBeVisible();

      await page.getByRole("link", { name: "Today" }).click();
      await expect(page.getByText("The Sixth Reel")).toBeVisible();

      // Editing the movie's date into the previous month moves it out of
      // the current month's page entirely.
      await page.getByRole("button", { name: /More actions/ }).click();
      await page.getByRole("menuitem", { name: "Edit watch date" }).click();
      const dialog = page.getByRole("dialog", { name: "Edit watch date" });
      await dialog.getByLabel("Watched on").fill(localDateInput(-1));
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(dialog).not.toBeVisible();
      await expect(page.getByText(`Nothing watched in ${monthLabel(0)}.`)).toBeVisible();

      // ...and it's really there once that month is opened, at the correct
      // date group — not just gone.
      await page.getByRole("link", { name: "Previous month" }).click();
      await expect(page.getByRole("heading", { name: dateGroupHeading(-1) })).toBeVisible();
      await expect(page.getByText("The Sixth Reel")).toBeVisible();
    });
  });

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Diary is usable on a touch-sized viewport, including month navigation and corrections", async ({
    page,
  }) => {
    await page.goto("/movies/556");
    await page.getByRole("button", { name: "Mark watched", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Watched$/ })).toBeVisible();

    await page.goto("/library/diary");
    await expect(page.getByRole("heading", { level: 1, name: "Diary" })).toBeVisible();
    const row = diaryRow(page, /The Seventh Reel/).first();
    await expect(row).toBeVisible();

    // Month navigation stays reachable and operable at a phone width.
    await expect(page.getByRole("button", { name: monthLabel(0) })).toBeVisible();
    await page.getByRole("link", { name: "Previous month" }).click();
    await expect(page.getByRole("button", { name: monthLabel(-1) })).toBeVisible();
    await page.getByRole("link", { name: "Today" }).click();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: /More actions/ }).click();
    await page.getByRole("menuitem", { name: "Edit watch date" }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit watch date" });
    await expect(editDialog).toBeVisible();
    await editDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(editDialog).not.toBeVisible();

    await row.getByRole("button", { name: /More actions/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete this entry?" });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(deleteDialog).not.toBeVisible();
    await expect(row).toBeVisible();
  });
});
