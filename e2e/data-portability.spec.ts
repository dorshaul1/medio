import { expect, test } from "@playwright/test";

// Deterministic — served by e2e/tmdb-mock-server.ts, never live TMDB.
// "The Ninth Reel" (movie 620) is used exclusively by this file — see
// the fixture comment by MOVIE_IMPORT_1 in tmdb-mock-server.ts. Every
// test mutates the suite's one authenticated user's import history, so
// this runs as one serial sequence.
function letterboxdDiaryCsv(watchedDate: string): string {
  return [
    "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
    `2026-01-01,The Ninth Reel,2019,https://letterboxd.com/film/the-ninth-reel/,,,,${watchedDate}`,
  ].join("\n");
}

function diaryRow(page: import("@playwright/test").Page, titlePattern: RegExp) {
  return page.getByRole("listitem").filter({ hasText: titlePattern });
}

test.describe
  .serial("Data Portability — Letterboxd import", () => {
    test("previews, confirms, and the imported watch appears in Diary", async ({ page }) => {
      await page.goto("/settings/data");
      await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: /Letterboxd/ }).click();
      await page.setInputFiles("#import-file-input", {
        name: "diary.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(letterboxdDiaryCsv("2026-08-01")),
      });
      await page.getByRole("button", { name: "Preview import" }).click();

      await expect(page.getByText("1 items found")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("1 ready")).toBeVisible();

      await page.getByRole("button", { name: "Confirm import" }).click();
      await expect(page.getByText(/Imported 1 record/)).toBeVisible({ timeout: 10000 });

      await page.goto("/library/diary");
      await expect(diaryRow(page, /The Ninth Reel/)).toBeVisible();
    });

    test("re-importing the same file does not create a duplicate watch event", async ({ page }) => {
      await page.goto("/settings/data");
      await page.getByRole("button", { name: /Letterboxd/ }).click();
      await page.setInputFiles("#import-file-input", {
        name: "diary.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(letterboxdDiaryCsv("2026-08-01")),
      });
      await page.getByRole("button", { name: "Preview import" }).click();

      // The same movie + same watched date is now a duplicate, not a
      // second ready item.
      await expect(page.getByText("0 ready")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/already have this/)).toBeVisible();

      await page.goto("/library/diary");
      await expect(diaryRow(page, /The Ninth Reel/)).toHaveCount(1);
    });

    test("a genuine rewatch on a different date creates a second, separate viewing", async ({
      page,
    }) => {
      await page.goto("/settings/data");
      await page.getByRole("button", { name: /Letterboxd/ }).click();
      await page.setInputFiles("#import-file-input", {
        name: "diary.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(letterboxdDiaryCsv("2026-08-10")),
      });
      await page.getByRole("button", { name: "Preview import" }).click();
      await expect(page.getByText("1 ready")).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: "Confirm import" }).click();
      await expect(page.getByText(/Imported 1 record/)).toBeVisible({ timeout: 10000 });

      await page.goto("/library/diary");
      await expect(diaryRow(page, /The Ninth Reel/)).toHaveCount(2);
    });

    test("undoing the most recent import batch removes only what it created", async ({ page }) => {
      await page.goto("/settings/data");
      await expect(page.getByRole("heading", { name: "Recent imports" })).toBeVisible();

      // Most-recent-first history — the top "Undo" is the rewatch batch
      // from the previous test (the duplicate-only attempt never
      // confirmed, so it never created a batch at all).
      await page.getByRole("button", { name: "Undo" }).first().click();
      await page.getByRole("button", { name: "Undo import" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });

      // The most recent batch's rewatch is gone; the earlier viewing
      // (from a separate, already-confirmed batch) survives untouched.
      await page.goto("/library/diary");
      await expect(diaryRow(page, /The Ninth Reel/)).toHaveCount(1);
    });
  });
