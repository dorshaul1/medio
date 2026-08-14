import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "Eleventh Watch" (show 1700) and "Twelfth Watch" (show 1701) are used
// exclusively by this file — see the fixture comments by
// SHOW_HOME_LAYOUT_1 in tmdb-mock-server.ts. Every test here mutates
// shared Home layout/Show Up Next/Home calendar view preference state
// (and tracking/planning state) for the suite's one authenticated user,
// so this runs as one serial sequence.
//
// "Calendar" and "Upcoming" are option labels shared by more than one
// radio group on /settings/home (Home layout, Home calendar view,
// Calendar page view all offer one or both) — every interaction below
// scopes to its own `radiogroup` by accessible name rather than a bare
// `getByRole("radio", { name })`, which would otherwise match more than
// one control.
test.describe
  .serial("Home layout", () => {
    test("Calendar layout shows the full calendar grid by default, reusing Calendar's own domain", async ({
      page,
    }) => {
      await page.goto("/shows/1700");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Start watching" }).click();
      await page.getByRole("button", { name: "Tracking options" }).waitFor({ timeout: 10000 });
      await page.goto("/shows/1700/seasons/1");
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      await page.goto("/settings/home");
      const homeLayout = page.getByRole("radiogroup", { name: "Home layout" });
      await homeLayout.getByRole("radio", { name: "Calendar" }).click();
      await expect(
        homeLayout.getByRole("radio", { name: "Calendar", checked: true }),
      ).toBeVisible();
      // The radio's own "checked" reflects immediate optimistic client
      // state, not the underlying Server Action write — wait for the
      // network to settle so the next navigation reliably reads the
      // persisted value rather than racing it.
      await page.waitForLoadState("networkidle");

      await page.goto("/");
      // A moment right after navigation can transiently show more than
      // one match for streamed/Suspense-boundary content — settling on
      // network idle before asserting avoids a flaky strict-mode
      // violation on the month label below.
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "New & upcoming" })).toBeVisible();

      // The month grid, not the Today/This week/Later agenda — real
      // month-navigation controls the same `/calendar?view=calendar` page
      // exposes, "Home calendar view" defaults to the full grid without
      // being touched.
      const now = new Date();
      const monthLabel = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(now);
      await expect(page.getByText(monthLabel)).toBeVisible();
      await expect(page.getByRole("link", { name: "Next month" })).toBeVisible();
      // The month grid's own per-day heading can legitimately read
      // "Today" (see `formatReleaseDate`) — "This week"/"Later" are the
      // agenda's own section labels and never appear here, which is the
      // real distinguishing check.
      await expect(page.getByRole("heading", { name: "This week" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Later" })).toHaveCount(0);

      // The Calendar layout's body is calendar content only — no
      // Continue Watching/Finish Soon rows, no Backlog row, zero public
      // discovery sections (Discover already owns broad browsing).
      await expect(page.getByRole("heading", { name: "Continue Watching" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "From your Backlog" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Trending movies" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Trending shows" })).toHaveCount(0);
    });

    test("Home calendar view can be switched to the upcoming agenda", async ({ page }) => {
      await page.goto("/settings/home");
      const homeCalendarView = page.getByRole("radiogroup", { name: "Home calendar view" });
      await homeCalendarView.getByRole("radio", { name: "Upcoming" }).click();
      await expect(
        homeCalendarView.getByRole("radio", { name: "Upcoming", checked: true }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");

      await page.goto("/");
      const today = page.getByRole("heading", { name: "Today" }).locator("..");
      await expect(today.getByText("Eleventh Watch")).toBeVisible();

      const thisWeek = page.getByRole("heading", { name: "This week" }).locator("..");
      await expect(thisWeek.getByText("Eleventh Watch")).toBeVisible();

      // Restore the default for the rest of this file.
      await page.goto("/settings/home");
      await homeCalendarView.getByRole("radio", { name: "Calendar" }).click();
      await expect(
        homeCalendarView.getByRole("radio", { name: "Calendar", checked: true }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
    });

    test("Calendar page view is a separate preference from Home calendar view", async ({
      page,
    }) => {
      await page.goto("/settings/home");
      const calendarPageView = page.getByRole("radiogroup", { name: "Calendar page view" });
      await calendarPageView.getByRole("radio", { name: "Calendar" }).click();
      await expect(
        calendarPageView.getByRole("radio", { name: "Calendar", checked: true }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");

      // Home's own Calendar layout (still on the full grid, from the
      // earlier test) is unaffected by the Calendar page's own default.
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "New & upcoming" })).toBeVisible();

      // The full Calendar page itself now opens straight to the grid.
      await page.goto("/calendar");
      await expect(page.getByRole("link", { name: "Next month" })).toBeVisible();

      // Restore the default for any test that runs after this file.
      await page.goto("/settings/home");
      await calendarPageView.getByRole("radio", { name: "Upcoming" }).click();
      await expect(
        calendarPageView.getByRole("radio", { name: "Upcoming", checked: true }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
    });

    test("Personal layout adds a Backlog row and reduces discovery below Balanced's", async ({
      page,
    }) => {
      await page.goto("/shows/1701");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("button", { name: "Watchlist" })).toBeVisible();
      await page.getByRole("button", { name: "Watchlist" }).click();
      await page.getByRole("menuitem", { name: /Move to Backlog/ }).click();
      await expect(page.getByRole("button", { name: "Backlog" })).toBeVisible();

      await page.goto("/settings/home");
      const homeLayout = page.getByRole("radiogroup", { name: "Home layout" });
      await homeLayout.getByRole("radio", { name: "Personal" }).click();
      await expect(
        homeLayout.getByRole("radio", { name: "Personal", checked: true }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "From your Backlog" })).toBeVisible();
      await expect(page.getByRole("link", { name: /Twelfth Watch/ })).toBeVisible();

      // No calendar content at all in Personal layout.
      await expect(page.getByRole("heading", { name: "New & upcoming" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Coming up" })).toHaveCount(0);

      // Discovery cut to one section — down from Balanced's two.
      await expect(page.getByRole("heading", { name: "Trending movies" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Trending shows" })).toHaveCount(0);
    });

    test("Balanced layout shows a small, header-less calendar teaser alongside a light amount of discovery", async ({
      page,
    }) => {
      await page.goto("/settings/home");
      const homeLayout = page.getByRole("radiogroup", { name: "Home layout" });
      await homeLayout.getByRole("radio", { name: "Balanced" }).click();
      await expect(
        homeLayout.getByRole("radio", { name: "Balanced", checked: true }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");

      await page.goto("/");
      const comingUp = page.getByRole("heading", { name: "Coming up" }).locator("..");
      await expect(comingUp).toBeVisible();
      await expect(comingUp.getByText("Eleventh Watch").first()).toBeVisible();

      // Balanced's teaser is a flat, header-less list — never the
      // Calendar layout's own Today/This week/Later sections or grid.
      await expect(page.getByRole("heading", { name: "Today" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "New & upcoming" })).toHaveCount(0);

      // Both of Balanced's two discovery sections are present, but never
      // the full five (that would be Discover's job).
      await expect(page.getByRole("heading", { name: "Trending movies" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Trending shows" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Popular movies" })).toHaveCount(0);
    });

    test("Show Up Next is independent of Home layout — turning it off folds the show into Continue Watching instead of hiding it", async ({
      page,
    }) => {
      // Still on Balanced from the previous test — Eleventh Watch is the
      // only active show, so it renders as the Up Next card alone.
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 2, name: "Eleventh Watch" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Continue Watching" })).toHaveCount(0);

      await page.goto("/settings/home");
      await page.getByRole("switch", { name: "Show Up Next" }).click();
      await expect(page.getByRole("switch", { name: "Show Up Next" })).not.toBeChecked();
      await page.waitForLoadState("networkidle");

      await page.goto("/");
      // The dedicated Up Next hero card is gone — Balanced's layout body
      // becomes the first Home content, exactly as the preference
      // promises, but Eleventh Watch itself doesn't just vanish: it's
      // folded into the front of Continue Watching.
      await expect(page.getByRole("heading", { level: 2, name: "Eleventh Watch" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Continue Watching" })).toBeVisible();
      await expect(page.getByRole("link", { name: /Continue Eleventh Watch/ })).toBeVisible();

      // Restore the default for any test that runs after this file.
      await page.goto("/settings/home");
      await page.getByRole("switch", { name: "Show Up Next" }).click();
      await expect(page.getByRole("switch", { name: "Show Up Next" })).toBeChecked();
      await page.waitForLoadState("networkidle");
    });
  });

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the Calendar layout's compact agenda is usable at a phone width", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
    // Whatever the currently-set Home layout renders (this shares the
    // suite's one authenticated user/preference state with the serial
    // block above) must never overflow horizontally — a structural
    // check, not tied to exact layout/content, same precedent as
    // home.spec.ts's own mobile check.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
