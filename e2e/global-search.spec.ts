import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB. See
// discover.spec.ts's own header comment for why each test below searches
// a query textually relevant to the one fixture it's checking.

test("Ctrl+K opens GlobalSearch from anywhere in the app", async ({ page }) => {
  await page.goto("/library");

  await page.keyboard.press("Control+k");

  await expect(page.getByRole("dialog", { name: "Search Movies, Shows and People" })).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Search Movies, Shows and People" }),
  ).toBeFocused();
});

test("the desktop nav's Search trigger opens the same overlay", async ({ page }) => {
  await page.goto("/library");

  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
});

test("typing shows live suggestions across Movies, Shows, and People", async ({ page }) => {
  await page.goto("/library");
  await page.keyboard.press("Control+k");

  await page.getByRole("searchbox", { name: "Search Movies, Shows and People" }).fill("fight club");
  await expect(page.getByRole("link", { name: /Fight Club/ })).toBeVisible();
});

test("selecting a result navigates there and closes the overlay", async ({ page }) => {
  await page.goto("/library");
  await page.keyboard.press("Control+k");

  await page.getByRole("searchbox").fill("norton");
  const personLink = page.getByRole("link", { name: /Edward Norton/ });
  await expect(personLink).toBeVisible();
  await personLink.click();

  await expect(page).toHaveURL(/\/people\/819$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("Escape closes the overlay and returns focus to its trigger", async ({ page }) => {
  await page.goto("/library");
  const trigger = page.getByRole("button", { name: "Search" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("See all results leads to the full Discover results page", async ({ page }) => {
  await page.goto("/library");
  await page.keyboard.press("Control+k");

  await page.getByRole("searchbox").fill("fight club");
  await page.getByRole("button", { name: /See all results/ }).click();

  await expect(page).toHaveURL(/\/discover\?q=fight(\+|%20)club$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("a no-match query shows a precise empty message", async ({ page }) => {
  await page.goto("/library");
  await page.keyboard.press("Control+k");

  await page.getByRole("searchbox").fill("zzznoresultszzz");
  await expect(
    page.getByText("No Movies, Shows or People found for “zzznoresultszzz”."),
  ).toBeVisible();
});

test("recent searches appear on reopening, and can be cleared", async ({ page }) => {
  await page.goto("/library");
  await page.keyboard.press("Control+k");
  await page.getByRole("searchbox").fill("fight club");
  await expect(page.getByRole("link", { name: /Fight Club/ })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.keyboard.press("Control+k");
  await expect(page.getByRole("button", { name: "fight club" })).toBeVisible();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("button", { name: "fight club" })).toHaveCount(0);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Search is reachable from the mobile header", async ({ page }) => {
    await page.goto("/library");

    await page.getByRole("button", { name: "Search Movies, Shows and People" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
