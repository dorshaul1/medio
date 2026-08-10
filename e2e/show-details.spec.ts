import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts (see global-setup.ts
// and playwright.config.ts), never live TMDB. "Winter's Watch"/"Second
// Season Watch" are this suite's fixture titles, not real TMDB IDs.

test("opening a show from Discover lands on its detail page", async ({ page }) => {
  await page.goto("/discover?type=shows");

  await page
    .getByRole("link", { name: /Winter's Watch/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/shows\/1399$/);
  await expect(page.getByRole("heading", { level: 1, name: "Winter's Watch" })).toBeVisible();
});

test("shows identity, essential metadata, and overview", async ({ page }) => {
  await page.goto("/shows/1399");

  await expect(page.getByRole("heading", { level: 1, name: "Winter's Watch" })).toBeVisible();
  await expect(page.getByText("Every legend has a beginning.")).toBeVisible();
  await expect(page.getByText("2011–2019")).toBeVisible();
  await expect(page.getByText("Ended")).toBeVisible();
  await expect(page.getByText("2 seasons · 12 episodes")).toBeVisible();
  await expect(page.getByText("Created by Fixture Creator")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Overview" })).toBeVisible();
  await expect(
    page.getByText("Noble families fight for control of a fictional land."),
  ).toBeVisible();
});

test("renders seasons as the primary section, ordered, with Specials last", async ({ page }) => {
  await page.goto("/shows/1399");

  const seasons = page.getByRole("region", { name: "Seasons" });
  await expect(seasons).toBeVisible();

  const links = seasons.getByRole("link");
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute("href", "/shows/1399/seasons/1");
  await expect(links.nth(1)).toHaveAttribute("href", "/shows/1399/seasons/2");
  await expect(links.nth(2)).toHaveAttribute("href", "/shows/1399/seasons/0");
  await expect(seasons.getByText("Specials")).toBeVisible();
});

test("renders the cast", async ({ page }) => {
  await page.goto("/shows/1399");

  await expect(page.getByRole("heading", { level: 2, name: "Cast" })).toBeVisible();
  await expect(page.getByText("Fixture Actor")).toBeVisible();
  await expect(page.getByText("Fixture Character")).toBeVisible();
  // Cast members are navigable to their Person page (see e2e/people.spec.ts
  // for the full actor/director navigation flows).
  await expect(page.getByRole("link", { name: /Fixture Actor/ })).toHaveAttribute(
    "href",
    "/people/22970",
  );
});

test("plays the trailer without autoplay, lazily", async ({ page }) => {
  await page.goto("/shows/1399");

  const trailerButton = page.getByRole("button", { name: "Play trailer" });
  await expect(trailerButton).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);

  await trailerButton.click();

  const iframe = page.getByRole("dialog").locator("iframe");
  await expect(iframe).toHaveCount(1);
  const src = await iframe.getAttribute("src");
  expect(src).toContain("SUXWAEX2jlg");
  expect(src).not.toContain("autoplay=1");
});

test("renders related shows", async ({ page }) => {
  await page.goto("/shows/1399");

  const recommendations = page.getByRole("region", { name: "More like this" });
  await expect(recommendations).toBeVisible();
  await expect(recommendations.getByRole("link", { name: /Second Season Watch/ })).toBeVisible();
});

test("missing optional data (no backdrop, tagline, credits, trailer, or recommendations) doesn't break the layout", async ({
  page,
}) => {
  await page.goto("/shows/1400");

  await expect(page.getByRole("heading", { level: 1, name: "Second Season Watch" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play trailer" })).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Cast" })).not.toBeVisible();
  await expect(page.getByText("Created by")).not.toBeVisible();
  // Still airing, no last air date on file — an open-ended range.
  await expect(page.getByText("2011–present")).toBeVisible();
});

test("an unknown show id 404s", async ({ page }) => {
  const response = await page.goto("/shows/999999");
  expect(response?.status()).toBe(404);
});

test("a non-numeric show id 404s", async ({ page }) => {
  const response = await page.goto("/shows/not-a-real-id");
  expect(response?.status()).toBe(404);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("identity, seasons, and trailer are all reachable", async ({ page }) => {
    await page.goto("/shows/1399");

    await expect(page.getByRole("heading", { level: 1, name: "Winter's Watch" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play trailer" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Seasons" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Season 1/ })).toBeVisible();
  });
});
