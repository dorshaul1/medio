import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "Third Watch" (show 1401, 2 aired episodes), "Fourth Watch" (show 1402,
// 6 aired episodes), and "The Fourth Reel" (movie 553, unreleased) are
// used exclusively by this file — other specs already mutate tracking
// state for the shared fixture titles, so Home's own coverage needs
// fixtures no other spec touches to run safely under full parallelism.
//
// On Hold/Dropped exclusion is covered by `server/home/queries.test.ts`
// (integration-level, against the real candidate query) rather than
// duplicated here — that boundary proves the SQL-level exclusion more
// directly than an e2e round trip would.

test.describe("new user", () => {
  // A genuinely fresh user, not the suite's shared authenticated session.
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ retries: 2 });

  test("no personal sections appear; public Home begins naturally", async ({ page }) => {
    const email = `home-new-user-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Home New User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Up Next" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Continue Watching" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Finish Soon" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Trending movies" })).toBeVisible();
  });
});

test.describe
  .serial("personalized Home", () => {
    // The longest, most heavily-sequenced flow in the suite (two shows,
    // several tracking mutations, three separate reloads) — under full
    // local parallelism (uncapped worker count; see playwright.config.ts's
    // comment on the same class of issue for the sign-up-rate-limit
    // flake) it has occasionally missed a `toBeVisible` window under
    // system load rather than any actual product defect (confirmed by
    // running it alone, repeatedly, with zero failures). A scoped retry
    // absorbs that instead of chasing single-run timing noise.
    test.describe.configure({ retries: 2 });

    test("Up Next, Continue Watching, Finish Soon, tracking mutations, and Caught Up transition", async ({
      page,
    }) => {
      // Third Watch (1401): 2 aired episodes. Mark episode 1 — 1 remaining.
      await page.goto("/shows/1401");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Start watching" }).click();
      await page.getByRole("button", { name: "Tracking options" }).waitFor({ timeout: 10000 });
      await page.goto("/shows/1401/seasons/1");
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      // Fourth Watch (1402): 6 aired episodes, started *after* Third Watch —
      // becomes Up Next as the most recently active show. Mark episode 1 —
      // 5 remaining (Continue Watching range, not Finish Soon).
      await page.goto("/shows/1402");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Start watching" }).click();
      await page.getByRole("button", { name: "Tracking options" }).waitFor({ timeout: 10000 });
      await page.goto("/shows/1402/seasons/1");
      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Fourth Watch is the most recently active — it becomes Up Next, with
      // its correct next episode (S1 E2).
      await expect(page.getByRole("heading", { level: 2, name: "Fourth Watch" })).toBeVisible();
      await expect(page.getByText("S1 E2 · Episode 2")).toBeVisible();
      await expect(page.getByText("5 episodes remaining")).toBeVisible();

      // Third Watch (1 remaining) shows under Finish Soon, not duplicated
      // under Continue Watching (which has nothing else to show).
      await expect(page.getByRole("heading", { name: "Finish Soon" })).toBeVisible();
      await expect(page.getByRole("link", { name: /Third Watch/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Continue Watching" })).toHaveCount(0);

      // Mark the Up Next episode watched directly from Home — a plain
      // toggle via the shared episode action (no "Watched · Undo"
      // confirmation; see up-next-mark-watched-button.tsx), which
      // revalidates Home immediately, so the card advances to the real
      // next Up Next state without a manual reload.
      await page.getByRole("button", { name: "Mark watched" }).click();
      // Fourth Watch now has 4 remaining — still Up Next (most recently
      // active), next episode advances to S1 E3.
      await expect(page.getByText("S1 E3 · Episode 3")).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Fourth Watch" })).toBeVisible();
      await expect(page.getByText("4 episodes remaining")).toBeVisible();

      // Caught Up transition: finish Third Watch's one remaining episode —
      // it should disappear from every personalized section entirely (an
      // Ended show with everything aired watched resolves to Completed).
      await page.goto("/shows/1401/seasons/1");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Mark episode 2 watched" }).click();

      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/Third Watch/)).toHaveCount(0);
      // Fourth Watch remains the active Up Next show.
      await expect(page.getByRole("heading", { level: 2, name: "Fourth Watch" })).toBeVisible();
    });
  });

test.describe("unreleased movie", () => {
  test("shows Not yet released instead of a watch control", async ({ page }) => {
    await page.goto("/movies/553");
    await expect(page.getByRole("heading", { level: 1, name: "The Fourth Reel" })).toBeVisible();
    await expect(page.getByText("Not yet released")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark watched" })).toHaveCount(0);
  });
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("personalized Home is usable on a touch-sized viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
    // Whatever personalized content exists (from the serial flow above,
    // if it already ran against the shared user) or public sections
    // (for a fresh run) must render without horizontal overflow — a
    // structural check, not tied to exact personalized content.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
