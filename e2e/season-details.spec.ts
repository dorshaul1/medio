import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.

test("opening a season from Show Details renders its episode list", async ({ page }) => {
  await page.goto("/shows/1399");

  await page.getByRole("link", { name: /Season 1/ }).click();

  await expect(page).toHaveURL(/\/shows\/1399\/seasons\/1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Season 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Winter Is Coming" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Kingsroad" })).toBeVisible();
});

test("shows the parent-show context link", async ({ page }) => {
  await page.goto("/shows/1399/seasons/1");

  const context = page.getByRole("link", { name: "Winter's Watch" });
  await expect(context).toBeVisible();
  await expect(context).toHaveAttribute("href", "/shows/1399");
});

test("missing episode data (overview, still, runtime, air date) doesn't break the layout", async ({
  page,
}) => {
  await page.goto("/shows/1399/seasons/1");

  await expect(page.getByRole("heading", { name: "The Kingsroad" })).toBeVisible();
});

test.describe
  .serial("next episode emphasis", () => {
    // Seventh Watch (1405) — its own dedicated fixture, since this test
    // mutates real tracking state and e2e/tracking.spec.ts separately
    // mutates SHOW's (1399) tracking state; see the fixture's own
    // comment in e2e/tmdb-mock-server.ts.
    test("the first unwatched aired episode is marked next, and moves on once watched", async ({
      page,
    }) => {
      await page.goto("/shows/1405/seasons/1");

      // Nothing watched yet — the first episode is next.
      await expect(page.getByRole("heading", { name: "Pilot — Next episode" })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Second Episode — Next episode" }),
      ).toHaveCount(0);

      await page.getByRole("button", { name: "Mark episode 1 watched" }).click();
      await expect(
        page.getByRole("button", { name: "Mark episode 1 as not watched" }),
      ).toBeVisible();

      // Next moves to the second episode; the first is no longer marked.
      await expect(
        page.getByRole("heading", { name: "Second Episode — Next episode" }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "Pilot — Next episode" })).toHaveCount(0);
    });
  });

test("an upcoming (not yet aired) episode renders normally", async ({ page }) => {
  await page.goto("/shows/1399/seasons/2");

  await expect(page.getByRole("heading", { name: "A Future Episode" })).toBeVisible();
});

test("Specials (season 0) is labeled by name, not 'Season 0'", async ({ page }) => {
  await page.goto("/shows/1399/seasons/0");

  await expect(page.getByRole("heading", { level: 1, name: "Specials" })).toBeVisible();
  await expect(page.getByText("Season 0")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Behind the Watch" })).toBeVisible();
});

test("adjacent-season navigation follows display order, with Specials last", async ({ page }) => {
  await page.goto("/shows/1399/seasons/1");

  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/shows\/1399\/seasons\/2$/);

  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/shows\/1399\/seasons\/0$/);
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
});

test("the season select jumps directly to a chosen season", async ({ page }) => {
  await page.goto("/shows/1399/seasons/1");

  await page.getByRole("combobox", { name: "Jump to season" }).click();
  await page.getByRole("option", { name: "Specials" }).click();

  await expect(page).toHaveURL(/\/shows\/1399\/seasons\/0$/);
});

test("an unknown season number 404s", async ({ page }) => {
  const response = await page.goto("/shows/1399/seasons/99");
  expect(response?.status()).toBe(404);
});

test("a negative season number 404s", async ({ page }) => {
  const response = await page.goto("/shows/1399/seasons/-1");
  expect(response?.status()).toBe(404);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("episode browsing is reachable", async ({ page }) => {
    await page.goto("/shows/1399/seasons/1");

    await expect(page.getByRole("heading", { level: 1, name: "Season 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Winter Is Coming" })).toBeVisible();
  });
});
