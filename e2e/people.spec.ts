import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB. See
// that file's "People fixtures" comment for the full fixture roster
// (Edward Norton/819 — actor, David Fincher/7467 — director, Fixture
// Creator/9813 — sparse profile, Fixture Auteur/3001 — mixed career with
// a long filmography).

test("clicking an actor from Movie Details opens their Person page with Acting filmography", async ({
  page,
}) => {
  await page.goto("/movies/550");

  await page.getByRole("link", { name: "Edward Norton" }).click();

  await expect(page).toHaveURL(/\/people\/819$/);
  await expect(page.getByRole("heading", { level: 1, name: "Edward Norton" })).toBeVisible();
  await expect(page.getByText(/An American actor/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Filmography" })).toBeVisible();

  const credit = page.getByRole("link", { name: /Fight Club/ });
  await expect(credit).toBeVisible();
  await expect(credit).toHaveText(/The Narrator/);

  await credit.click();
  await expect(page).toHaveURL(/\/movies\/550$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fight Club" })).toBeVisible();
});

test("clicking a director from Movie Details opens their Person page with clear Directing work", async ({
  page,
}) => {
  await page.goto("/movies/550");

  await page.getByRole("link", { name: "David Fincher" }).click();

  await expect(page).toHaveURL(/\/people\/7467$/);
  await expect(page.getByRole("heading", { level: 1, name: "David Fincher" })).toBeVisible();
  await expect(page.getByText("Director", { exact: true })).toBeVisible();

  const credit = page.getByRole("link", { name: /Fight Club/ });
  await expect(credit).toBeVisible();

  await credit.click();
  await expect(page).toHaveURL(/\/movies\/550$/);
});

test("clicking a show's creator opens their Person page — missing biography and photo are handled gracefully", async ({
  page,
}) => {
  await page.goto("/shows/1399");

  await page.getByRole("link", { name: "Fixture Creator" }).click();

  await expect(page).toHaveURL(/\/people\/9813$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fixture Creator" })).toBeVisible();
  // No biography on file — no "Biography" heading at all, not an empty
  // "Biography unavailable" section.
  await expect(page.getByRole("heading", { name: "Biography" })).not.toBeVisible();
  // No profile photo on file — the page still renders cleanly (identity
  // heading and Filmography both present, no crash).
  await expect(page.getByRole("link", { name: /Winter's Watch/ })).toBeVisible();
});

test("a mixed actor/director career shows both professional contexts distinctly", async ({
  page,
}) => {
  await page.goto("/people/3001");

  await expect(page.getByRole("heading", { level: 1, name: "Fixture Auteur" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Directing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acting" })).toBeVisible();

  // Fight Club (movie, directed) and Winter's Watch (show, acted) both
  // appear inside the Filmography section itself — scoped there since
  // both titles also legitimately appear a second time in the Known For
  // row above it.
  const filmography = page.getByRole("region", { name: "Filmography" });
  await expect(filmography.getByRole("link", { name: "Fight Club", exact: true })).toBeVisible();
  await expect(filmography.getByRole("link", { name: /Winter's Watch/ })).toBeVisible();
});

test("a long filmography stays bounded with a Show more reveal", async ({ page }) => {
  await page.goto("/people/3001");
  const filmography = page.getByRole("region", { name: "Filmography" });

  // 14 Acting credits (capped at 12) + 2 Directing credits = 14 rows
  // visible up front, not all 16.
  await expect(filmography.getByRole("listitem")).toHaveCount(14);

  const showMore = filmography.getByRole("button", { name: "Show 2 more" });
  await expect(showMore).toBeVisible();
  await showMore.click();

  await expect(showMore).not.toBeVisible();
  await expect(filmography.getByRole("listitem")).toHaveCount(16);
});

test("the Filmography filter is URL-addressable and narrows to one section", async ({ page }) => {
  await page.goto("/people/3001");
  const filmography = page.getByRole("region", { name: "Filmography" });

  await page.getByRole("link", { name: "Directing", exact: true }).click();
  await expect(page).toHaveURL(/\/people\/3001\?credit=directing$/);
  await expect(page.getByRole("heading", { name: "Acting" })).not.toBeVisible();
  await expect(filmography.getByRole("link", { name: "Fight Club", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "All", exact: true }).click();
  await expect(page).toHaveURL(/\/people\/3001$/);
  await expect(page.getByRole("heading", { name: "Acting" })).toBeVisible();
});

test("switching the Filmography filter does not jump the page back to the top", async ({
  page,
}) => {
  await page.goto("/people/3001");

  await page.getByRole("heading", { name: "Filmography" }).scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);

  await page.getByRole("link", { name: "Directing", exact: true }).click();
  await expect(page).toHaveURL(/\/people\/3001\?credit=directing$/);

  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(scrollAfter).toBeGreaterThan(0);
});

test("an unknown person id 404s", async ({ page }) => {
  const response = await page.goto("/people/999999");
  expect(response?.status()).toBe(404);
});

test("a non-numeric person id 404s", async ({ page }) => {
  const response = await page.goto("/people/not-a-real-id");
  expect(response?.status()).toBe(404);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a Person page works on a touch-sized viewport", async ({ page }) => {
    await page.goto("/people/819");

    await expect(page.getByRole("heading", { level: 1, name: "Edward Norton" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fight Club/ })).toBeVisible();
  });
});
