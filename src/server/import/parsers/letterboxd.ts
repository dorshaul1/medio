// Parses Letterboxd's exported CSV files into normalized import records
// — see docs/data-portability.md, "Letterboxd" for the verified (via
// secondary technical sources — Letterboxd's own docs 403 automated
// fetches) file/column shape this is built against, and its documented
// limitations. Pure: no I/O, no TMDB calls — every record here is a
// `titleYear` identity ref for `server/import/matching.ts` to resolve.
//
// A Letterboxd export is several separate CSV files (diary.csv,
// ratings.csv, watchlist.csv, ...), not one. This accepts however many
// of them the user uploaded and auto-detects which is which by column
// shape, rather than making the user categorize each file themselves —
// see docs/data-portability.md, "Import UX must not feel like a
// developer/admin tool".
import { findColumn, hasColumn } from "../csv-headers";
import { parseCsv } from "../csv-parse";
import { parseDateOnly } from "../date";
import type { ImportParseError, ParsedImportRecord, ParseResult } from "../types";

export type LetterboxdFile = {
  name: string;
  content: string;
};

// Letterboxd's own rating scale is 0.5–5 in half-star steps; MEDIO's is
// a 1–5 integer scale (see docs/opinions.md, "Rating scale") — there is
// no half-step support to preserve, and silently truncating/flooring
// would understate real enthusiasm (a 4.5★ Letterboxd rating is much
// closer to "5" than "4"). Standard round-half-up, clamped to MEDIO's
// range — the least destructive of the documented options (see
// docs/data-portability.md, "Letterboxd ratings"). Never silent: the
// caller always keeps `sourceRatingLabel` alongside the converted value
// so the import preview can show the exact conversion.
export function convertLetterboxdRating(raw: number): number {
  const rounded = Math.round(raw);
  return Math.min(5, Math.max(1, rounded));
}

function parseYear(row: Record<string, string>): number | null {
  const raw = findColumn(row, "Year", "Release Year");
  if (!raw) return null;
  const year = Number.parseInt(raw, 10);
  return Number.isInteger(year) ? year : null;
}

function isDiaryFile(headers: readonly string[]): boolean {
  return hasColumn(headers, "Watched Date");
}

function isRatingsFile(headers: readonly string[]): boolean {
  return hasColumn(headers, "Rating") && !hasColumn(headers, "Watched Date");
}

function isWatchlistFile(headers: readonly string[]): boolean {
  return (
    !hasColumn(headers, "Watched Date") &&
    !hasColumn(headers, "Rating") &&
    (hasColumn(headers, "Name") || hasColumn(headers, "Title") || hasColumn(headers, "Film Title"))
  );
}

export function parseLetterboxdFiles(files: readonly LetterboxdFile[]): ParseResult {
  const records: ParsedImportRecord[] = [];
  const errors: ImportParseError[] = [];
  let row = 0;

  for (const file of files) {
    const { headers, rows } = parseCsv(file.content);

    if (rows.length === 0) {
      row++;
      errors.push({ row, reason: `"${file.name}" has no rows to import.` });
      continue;
    }

    if (isDiaryFile(headers)) {
      for (const csvRow of rows) {
        row++;
        const title = findColumn(csvRow, "Name", "Title", "Film Title");
        const watchedDateRaw = findColumn(csvRow, "Watched Date");
        if (!title) {
          errors.push({ row, reason: `${file.name}: row has no film title.` });
          continue;
        }
        if (!watchedDateRaw) {
          errors.push({ row, reason: `${file.name}: "${title}" has no Watched Date.` });
          continue;
        }
        const parsedDate = parseDateOnly(watchedDateRaw);
        if (!parsedDate) {
          errors.push({ row, reason: `${file.name}: "${title}" has an invalid Watched Date.` });
          continue;
        }
        records.push({
          kind: "movieWatch",
          identity: { kind: "titleYear", mediaType: "movie", title, year: parseYear(csvRow) },
          watchedAt: parsedDate.date,
          datePrecision: parsedDate.precision,
        });
      }
      continue;
    }

    if (isRatingsFile(headers)) {
      for (const csvRow of rows) {
        row++;
        const title = findColumn(csvRow, "Name", "Title", "Film Title");
        const ratingRaw = findColumn(csvRow, "Rating");
        if (!title || !ratingRaw) {
          errors.push({ row, reason: `${file.name}: row is missing a title or rating.` });
          continue;
        }
        const ratingValue = Number.parseFloat(ratingRaw);
        if (!Number.isFinite(ratingValue) || ratingValue < 0.5 || ratingValue > 5) {
          errors.push({
            row,
            reason: `${file.name}: "${title}" has an unrecognized rating value.`,
          });
          continue;
        }
        records.push({
          kind: "rating",
          identity: { kind: "titleYear", mediaType: "movie", title, year: parseYear(csvRow) },
          rating: convertLetterboxdRating(ratingValue),
          sourceRatingLabel: `${ratingValue}★ (Letterboxd)`,
        });
      }
      continue;
    }

    if (isWatchlistFile(headers)) {
      for (const csvRow of rows) {
        row++;
        const title = findColumn(csvRow, "Name", "Title", "Film Title");
        if (!title) {
          errors.push({ row, reason: `${file.name}: row has no film title.` });
          continue;
        }
        records.push({
          kind: "planningItem",
          identity: { kind: "titleYear", mediaType: "movie", title, year: parseYear(csvRow) },
          // Letterboxd's Watchlist has no stronger-intent concept — every
          // entry maps to MEDIO's lighter Watchlist intent, never Backlog
          // (see docs/data-portability.md, "Letterboxd").
          intent: "watchlist",
        });
      }
      continue;
    }

    row++;
    errors.push({
      row,
      reason: `"${file.name}" doesn't match a recognized Letterboxd export file (diary.csv, ratings.csv, or watchlist.csv).`,
    });
  }

  return { records, errors };
}
