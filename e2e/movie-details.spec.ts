import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts (see global-setup.ts
// and playwright.config.ts), never live TMDB. "Fight Club"/"The Second
// Reel" are this suite's fixture titles, not real TMDB IDs.

test("opening a movie from Discover lands on its detail page with real content", async ({
  page,
}) => {
  await page.goto("/discover");

  await page
    .getByRole("link", { name: /Fight Club/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/movies\/550$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fight Club" })).toBeVisible();
});

test("opening a movie from search lands on its detail page", async ({ page }) => {
  await page.goto("/discover");

  const search = page.getByRole("searchbox", { name: "Search movies and TV shows" });
  await search.fill("fight");
  await search.press("Enter");
  await page
    .getByRole("link", { name: /Fight Club/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/movies\/550$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fight Club" })).toBeVisible();
});

test("shows identity, essential metadata, and overview", async ({ page }) => {
  await page.goto("/movies/550");

  await expect(page.getByRole("heading", { level: 1, name: "Fight Club" })).toBeVisible();
  await expect(page.getByText("Mischief. Mayhem. Soap.")).toBeVisible();
  // "1999" also appears on the related-movies poster caption further down
  // the page — .first() disambiguates to the hero's own metadata line.
  await expect(page.getByText("1999").first()).toBeVisible();
  await expect(page.getByText("2h 19m")).toBeVisible();
  await expect(page.getByText("8.4")).toBeVisible();
  await expect(page.getByText("Directed by David Fincher")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Overview" })).toBeVisible();
  await expect(
    page.getByText(
      "An insomniac office worker and a devil-may-care soap maker form an underground fight club.",
    ),
  ).toBeVisible();
});

test("renders the cast", async ({ page }) => {
  await page.goto("/movies/550");

  await expect(page.getByRole("heading", { level: 2, name: "Cast" })).toBeVisible();
  await expect(page.getByText("Edward Norton")).toBeVisible();
  await expect(page.getByText("The Narrator")).toBeVisible();
  await expect(page.getByText("Brad Pitt")).toBeVisible();

  // Cast members are navigable to their Person page (see e2e/people.spec.ts
  // for the full actor/director navigation flows).
  await expect(page.getByRole("link", { name: /Edward Norton/ })).toHaveAttribute(
    "href",
    "/people/819",
  );
});

test("plays the trailer without autoplay, lazily", async ({ page }) => {
  await page.goto("/movies/550");

  const trailerButton = page.getByRole("button", { name: "Play trailer" });
  await expect(trailerButton).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);

  await trailerButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const iframe = dialog.locator("iframe");
  await expect(iframe).toHaveCount(1);
  const src = await iframe.getAttribute("src");
  expect(src).toContain("SUXWAEX2jlg");
  expect(src).not.toContain("autoplay=1");

  await page.getByRole("button", { name: "Close" }).click();
  await expect(dialog).not.toBeVisible();
});

test("renders related movies", async ({ page }) => {
  await page.goto("/movies/550");

  const recommendations = page.getByRole("region", { name: "More like this" });
  await expect(recommendations).toBeVisible();
  // "The Second Reel" also appears in the franchise collection row above —
  // scoped to disambiguate.
  await expect(recommendations.getByRole("link", { name: /The Second Reel/ })).toBeVisible();
});

test("renders the franchise collection, excluding the movie being viewed", async ({ page }) => {
  await page.goto("/movies/550");

  const collection = page.getByRole("region", { name: "Fixture Collection" });
  await expect(collection).toBeVisible();
  await expect(collection.getByRole("link", { name: /The Second Reel/ })).toBeVisible();
  // Fight Club is part of its own fixture collection but shouldn't list
  // itself — that's the page it's already on.
  await expect(collection.getByRole("link", { name: /Fight Club/ })).toHaveCount(0);
});

test("missing optional data (no backdrop, tagline, credits, trailer, collection, or recommendations) doesn't break the layout", async ({
  page,
}) => {
  await page.goto("/movies/551");

  await expect(page.getByRole("heading", { level: 1, name: "The Second Reel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play trailer" })).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Cast" })).not.toBeVisible();
  await expect(page.getByText("Directed by")).not.toBeVisible();
  await expect(page.getByRole("region", { name: "Fixture Collection" })).not.toBeVisible();
});

test("an unknown movie id 404s", async ({ page }) => {
  const response = await page.goto("/movies/999999");
  expect(response?.status()).toBe(404);
});

test("a non-numeric movie id 404s", async ({ page }) => {
  const response = await page.goto("/movies/not-a-real-id");
  expect(response?.status()).toBe(404);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("identity, trailer, and cast are all reachable", async ({ page }) => {
    await page.goto("/movies/550");

    await expect(page.getByRole("heading", { level: 1, name: "Fight Club" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play trailer" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Cast" })).toBeVisible();
    await expect(page.getByText("Edward Norton")).toBeVisible();
  });
});
