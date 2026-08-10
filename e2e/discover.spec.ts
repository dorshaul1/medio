import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts (see global-setup.ts
// and playwright.config.ts), never live TMDB. "Fight Club"/"Winter's
// Watch" are this suite's fixture titles, not real TMDB IDs.

test("Discover defaults to Movies mode with curated genre rows", async ({ page }) => {
  await page.goto("/discover");

  await expect(page.getByRole("heading", { level: 1, name: "Discover" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Movies" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Shows" })).not.toHaveAttribute("aria-current");

  await expect(page.getByRole("heading", { level: 2, name: "Action" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fight Club/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View all" }).first()).toBeVisible();

  // Home's Trending/Popular sections don't leak into Discover.
  await expect(page.getByRole("heading", { level: 2, name: "Trending movies" })).not.toBeVisible();
});

test("switching to Shows updates the URL and shows TV genres", async ({ page }) => {
  await page.goto("/discover");

  await page.getByRole("link", { name: "Shows" }).click();

  await expect(page).toHaveURL(/\/discover\?type=shows$/);
  await expect(page.getByRole("link", { name: "Shows" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: /Winter's Watch/ }).first()).toBeVisible();
});

test("searching shows movie/show results and hides genre browsing", async ({ page }) => {
  await page.goto("/discover");

  const search = page.getByRole("searchbox", { name: "Search movies and TV shows" });
  await search.fill("fight");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/discover\?q=fight$/);
  await expect(page.getByRole("heading", { level: 2, name: "Movies" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "TV Shows" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fight Club/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Winter's Watch/ })).toBeVisible();

  // Genre browsing is gone while a search is active.
  await expect(page.getByRole("heading", { level: 2, name: "Action" })).not.toBeVisible();
});

test("a query with no matches shows a quiet empty state, not an error", async ({ page }) => {
  await page.goto("/discover?q=zzznoresultszzz");

  await expect(page.getByText("No results for “zzznoresultszzz”.")).toBeVisible();
});

test("clearing search restores genre browsing", async ({ page }) => {
  await page.goto("/discover?q=fight");
  await expect(page.getByRole("heading", { level: 2, name: "Movies" })).toBeVisible();

  await page.getByRole("button", { name: "Clear search" }).click();

  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole("heading", { level: 2, name: "Action" })).toBeVisible();
});

test("View all opens the dedicated genre page, with sort and pagination", async ({ page }) => {
  await page.goto("/discover");

  await page.getByRole("link", { name: "View all" }).first().click();

  await expect(page).toHaveURL(/\/discover\/movies\/genre\/action$/);
  await expect(page.getByRole("heading", { level: 1, name: "Action Movies" })).toBeVisible();
  // Discover stays the active primary destination on a nested genre route.
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Discover" }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/discover\/movies\/genre\/action\?sort=popular&page=2$/);
  await expect(page.getByText("The Second Reel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

  await page.getByRole("link", { name: "Previous" }).click();
  await expect(page).toHaveURL(/\/discover\/movies\/genre\/action\?sort=popular&page=1$/);
});

test("an unknown genre slug 404s", async ({ page }) => {
  const response = await page.goto("/discover/movies/genre/not-a-real-genre");
  expect(response?.status()).toBe(404);
});

test("clicking a poster navigates to its canonical detail page", async ({ page }) => {
  await page.goto("/discover");

  await page
    .getByRole("link", { name: /Fight Club/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/movies\/550$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fight Club" })).toBeVisible();
  await expect(page.getByText("Mischief. Mayhem. Soap.")).toBeVisible();
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("search and the Movies/Shows control are both reachable", async ({ page }) => {
    await page.goto("/discover");

    await expect(page.getByRole("searchbox", { name: "Search movies and TV shows" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Movies" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shows" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Action" })).toBeVisible();
  });
});
