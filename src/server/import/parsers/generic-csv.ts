// Parses MEDIO's own small, documented generic CSV schema — a bounded
// migration path from any app/spreadsheet that isn't Letterboxd/MEDIO
// itself (see docs/data-portability.md, "Generic CSV"). Deliberately
// not an arbitrary column-mapping importer — exactly these columns, in
// any order, matched by exact (case-insensitive) header name only.
//
// Columns: media_type, title, year, season, episode, watched_at,
// rating, list. Every column but `media_type`/`title` is optional. One
// row can produce more than one record — e.g. a row with both
// `watched_at` and `rating` filled in creates a watch event *and* a
// rating from the same line, since a real "I watched and rated this"
// spreadsheet row is a completely ordinary shape to migrate from.
import { findColumn } from "../csv-headers";
import { parseCsv } from "../csv-parse";
import { parseDateOnly } from "../date";
import type { ImportParseError, ParsedImportRecord, ParseResult } from "../types";

export const GENERIC_CSV_COLUMNS = [
  "media_type",
  "title",
  "year",
  "season",
  "episode",
  "watched_at",
  "rating",
  "list",
] as const;

// A small, real example a user can download and edit — see
// docs/data-portability.md, "Generic CSV template".
export const GENERIC_CSV_TEMPLATE = [
  GENERIC_CSV_COLUMNS.join(","),
  "movie,Fight Club,1999,,,1999-10-15,5,",
  "show,Winter's Watch,2011,1,1,2020-01-01,,",
  "movie,The Third Reel,2021,,,,,watchlist",
].join("\n");

function parseYear(raw: string | undefined): number | null {
  if (!raw) return null;
  const year = Number.parseInt(raw, 10);
  return Number.isInteger(year) ? year : null;
}

export function parseGenericCsv(text: string): ParseResult {
  const { rows } = parseCsv(text);
  const records: ParsedImportRecord[] = [];
  const errors: ImportParseError[] = [];
  let row = 0;

  for (const csvRow of rows) {
    row++;
    const mediaTypeRaw = findColumn(csvRow, "media_type")?.trim().toLowerCase();
    const title = findColumn(csvRow, "title");

    if (mediaTypeRaw !== "movie" && mediaTypeRaw !== "show") {
      errors.push({ row, reason: `Row ${row}: "media_type" must be "movie" or "show".` });
      continue;
    }
    if (!title) {
      errors.push({ row, reason: `Row ${row}: missing "title".` });
      continue;
    }
    const mediaType = mediaTypeRaw;
    const year = parseYear(findColumn(csvRow, "year"));
    const seasonRaw = findColumn(csvRow, "season");
    const episodeRaw = findColumn(csvRow, "episode");
    const watchedAtRaw = findColumn(csvRow, "watched_at");
    const ratingRaw = findColumn(csvRow, "rating");
    const listRaw = findColumn(csvRow, "list")?.trim().toLowerCase();

    if (watchedAtRaw) {
      const parsedDate = parseDateOnly(watchedAtRaw);
      if (!parsedDate) {
        errors.push({ row, reason: `Row ${row}: "${title}" has an invalid "watched_at" date.` });
      } else if (mediaType === "movie") {
        records.push({
          kind: "movieWatch",
          identity: { kind: "titleYear", mediaType: "movie", title, year },
          watchedAt: parsedDate.date,
          datePrecision: parsedDate.precision,
        });
      } else if (seasonRaw && episodeRaw) {
        const seasonNumber = Number.parseInt(seasonRaw, 10);
        const episodeNumber = Number.parseInt(episodeRaw, 10);
        if (!Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber)) {
          errors.push({ row, reason: `Row ${row}: "${title}" has an invalid season/episode.` });
        } else {
          records.push({
            kind: "episodeWatch",
            identity: { kind: "titleYear", mediaType: "show", title, year },
            seasonNumber,
            episodeNumber,
            episodeProviderId: null,
            watchedAt: parsedDate.date,
            datePrecision: parsedDate.precision,
          });
        }
      } else {
        // Vague "show watched on this date" with no season/episode —
        // never fabricated into an EpisodeWatchEvent (see
        // docs/data-portability.md, "Show-level history"). Skipped with
        // a real, documented reason rather than guessed at.
        errors.push({
          row,
          reason: `Row ${row}: "${title}" is a Show watch with no season/episode — vague show-level completion can't be imported as exact episode history, so it was skipped.`,
        });
      }
    }

    if (ratingRaw) {
      const rating = Number.parseInt(ratingRaw, 10);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors.push({
          row,
          reason: `Row ${row}: "${title}" has an invalid "rating" (must be 1–5).`,
        });
      } else {
        records.push({
          kind: "rating",
          identity: { kind: "titleYear", mediaType, title, year },
          rating,
          sourceRatingLabel: null,
        });
      }
    }

    if (listRaw) {
      if (listRaw !== "watchlist" && listRaw !== "backlog") {
        errors.push({
          row,
          reason: `Row ${row}: "${title}" has an unrecognized "list" value (must be "watchlist" or "backlog").`,
        });
      } else {
        records.push({
          kind: "planningItem",
          identity: { kind: "titleYear", mediaType, title, year },
          intent: listRaw,
        });
      }
    }
  }

  return { records, errors };
}
