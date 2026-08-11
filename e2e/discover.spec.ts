import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts (see global-setup.ts
// and playwright.config.ts), never live TMDB. "Fight Club" (movie),
// "Winter's Watch" (show), and "Edward Norton" (person) are this suite's
// fixture titles/names, not real TMDB identities. The mock server always
// returns the same canned item per type regardless of the query text, so
// each search test below picks a query that's textually relevant to the
// one fixture it's checking — exercising Unified Search's own relevance
// filtering (an irrelevant type-mismatched fixture must not survive
// ranking) rather than working around it.

test("Discover defaults to Movies mode with curated genre rows and an editorial collection", async ({
  page,
}) => {
  await page.goto("/discover");

  await expect(page.getByRole("heading", { level: 1, name: "Discover" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Movies" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Shows" })).not.toHaveAttribute("aria-current");

  await expect(page.getByRole("heading", { level: 2, name: "Acclaimed movies" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Action" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fight Club/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View all" }).first()).toBeVisible();

  // Home's own Trending/Popular sections don't leak into Discover.
  await expect(page.getByRole("heading", { level: 2, name: "Trending movies" })).not.toBeVisible();
});

test("switching to Shows updates the URL, shows TV genres, and a Shows-specific editorial row", async ({
  page,
}) => {
  await page.goto("/discover");

  await page.getByRole("link", { name: "Shows" }).click();

  await expect(page).toHaveURL(/\/discover\?type=shows$/);
  await expect(page.getByRole("link", { name: "Shows" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 2, name: "New TV" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Winter's Watch/ }).first()).toBeVisible();
});

test("searching finds a Movie by title, as one flat ranked list", async ({ page }) => {
  await page.goto("/discover");

  const search = page.getByRole("searchbox", { name: "Search movies and TV shows" });
  await search.fill("fight club");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/discover\?q=fight(\+|%20)club$/);
  await expect(page.getByRole("link", { name: /Fight Club/ })).toBeVisible();
  await expect(page.getByText("Movie", { exact: true })).toBeVisible();

  // Genre browsing is gone while a search is active.
  await expect(page.getByRole("heading", { level: 2, name: "Action" })).not.toBeVisible();
});

test("searching finds a Show by title", async ({ page }) => {
  await page.goto("/discover?q=winter");

  await expect(page.getByRole("link", { name: /Winter's Watch/ })).toBeVisible();
  await expect(page.getByText("Show", { exact: true })).toBeVisible();
});

test("searching finds a Person by name, and opens their Person page", async ({ page }) => {
  await page.goto("/discover?q=norton");

  const personLink = page.getByRole("link", { name: /Edward Norton/ });
  await expect(personLink).toBeVisible();
  await expect(page.getByText("Person", { exact: true })).toBeVisible();

  await personLink.click();
  await expect(page).toHaveURL(/\/people\/819$/);
  await expect(page.getByRole("heading", { level: 1, name: "Edward Norton" })).toBeVisible();
});

test("a query with no matches shows a precise empty state, not an error", async ({ page }) => {
  await page.goto("/discover?q=zzznoresultszzz");

  await expect(
    page.getByText("No Movies, Shows or People found for “zzznoresultszzz”."),
  ).toBeVisible();
});

test("clearing search restores genre browsing", async ({ page }) => {
  await page.goto("/discover?q=fight+club");
  await expect(page.getByRole("link", { name: /Fight Club/ })).toBeVisible();

  await page.getByRole("button", { name: "Clear search" }).click();

  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole("heading", { level: 2, name: "Action" })).toBeVisible();
});

test("Save a discovery title from a search result, and it stays visible on a later search", async ({
  page,
}) => {
  // "The Tenth Reel" — a dedicated search fixture, not Fight Club (which
  // e2e/tracking.spec.ts's own mobile test marks watched, which would
  // remove Discover's Save control for it entirely under parallelism).
  await page.goto("/discover?q=the+tenth+reel");

  await page.getByRole("button", { name: "Save The Tenth Reel to Watchlist" }).click();
  await expect(
    page.getByRole("button", { name: "The Tenth Reel: saved to Watchlist" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: "The Tenth Reel: saved to Watchlist" }),
  ).toBeVisible();
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

test("More genres links reach a non-curated genre page", async ({ page }) => {
  await page.goto("/discover");

  await page.getByRole("link", { name: "Documentary" }).click();
  await expect(page).toHaveURL(/\/discover\/movies\/genre\/documentary$/);
  await expect(page.getByRole("heading", { level: 1, name: "Documentary Movies" })).toBeVisible();
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
