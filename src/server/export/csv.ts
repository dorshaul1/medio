import "server-only";
import { getDiaryPage } from "@/server/diary/queries";
import type { DiaryCursor, DiaryEntry } from "@/server/diary/types";
import { buildCsv } from "./csv-write";

// A large page size — this reads the user's *entire* history in a
// bounded number of round trips, not one row at a time; still real
// pagination underneath (Diary's own keyset query), never one
// unbounded query (see docs/data-portability.md, "Large imports" — the
// same "stay bounded even for realistic multi-thousand-event histories"
// principle applies to export).
const EXPORT_PAGE_SIZE = 500;

const CSV_HEADERS = [
  "type",
  "title",
  "year",
  "season",
  "episode",
  "episode_title",
  "watched_at",
  "rewatch_number",
] as const;

function toRow(entry: DiaryEntry): string[] {
  if (entry.kind === "movie") {
    return [
      "movie",
      entry.title,
      entry.year?.toString() ?? "",
      "",
      "",
      "",
      entry.watchedAt.toISOString(),
      entry.ordinal.toString(),
    ];
  }
  if (entry.kind === "episode") {
    return [
      "show",
      entry.showTitle,
      "",
      entry.seasonNumber.toString(),
      entry.episodeNumber.toString(),
      entry.episodeTitle,
      entry.watchedAt.toISOString(),
      entry.ordinal.toString(),
    ];
  }
  // Provider hydration failed for this one event (see docs/diary.md,
  // "Provider failure") — the row still exports with its real identity
  // and date, never silently dropped, but never a fabricated title.
  if (entry.eventType === "movie") {
    return [
      "movie",
      `Movie ${entry.movieProviderId} (title unavailable)`,
      "",
      "",
      "",
      "",
      entry.watchedAt.toISOString(),
      entry.ordinal.toString(),
    ];
  }
  return [
    "show",
    `Show ${entry.showProviderId} (title unavailable)`,
    "",
    entry.seasonNumber.toString(),
    entry.episodeNumber.toString(),
    "",
    entry.watchedAt.toISOString(),
    entry.ordinal.toString(),
  ];
}

// The human-readable watch-history export — see docs/data-portability.md,
// "Export formats". Chronological (oldest first), using the exact same
// unified Diary read model (`getDiaryPage`) the Diary page itself
// renders from — never a separate history calculation. Movie and
// episode rewatches keep their real per-viewing rows; `rewatch_number`
// is Diary's own already-computed ordinal, not re-derived here.
export async function buildWatchHistoryCsv(): Promise<string> {
  const rows: string[][] = [];
  let cursor: DiaryCursor | null = null;
  let hasMore = true;

  while (hasMore) {
    const page = await getDiaryPage({
      filter: "all",
      sort: "oldest",
      cursor,
      limit: EXPORT_PAGE_SIZE,
    });
    for (const entry of page.entries) rows.push(toRow(entry));
    cursor = page.nextCursor;
    hasMore = page.hasMore;
  }

  return buildCsv([...CSV_HEADERS], rows);
}
