import type { LibraryRawState, LibrarySort } from "@/server/library/candidates";
import { LIBRARY_PAGE_SIZE } from "@/server/library/constants";
import type { MediaType } from "@/server/media/types";

// The Library's URL-addressable browsing state — see docs/library.md,
// "Filter URL state". An invalid/missing value always falls back to a
// sensible default rather than rejecting the request, the same
// convention `features/discover/discover-params.ts` uses.

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export function normalizeLibraryMediaType(
  raw: string | string[] | undefined,
): MediaType | undefined {
  const value = firstValue(raw);
  return value === "movie" || value === "show" ? value : undefined;
}

const RAW_STATES: readonly LibraryRawState[] = [
  "watchlist",
  "backlog",
  "watching",
  "on_hold",
  "dropped",
  "watched",
];

export function normalizeLibraryState(
  raw: string | string[] | undefined,
): LibraryRawState | undefined {
  const value = firstValue(raw);
  return (RAW_STATES as readonly string[]).includes(value ?? "")
    ? (value as LibraryRawState)
    : undefined;
}

// Watchlist/Backlog apply to both media types; Watched is movie-only and
// Watching/On hold/Dropped are show-only. A state incompatible with the
// current type filter must never reach `getLibraryPage` (it would just
// silently return nothing) or the state Select (whose value wouldn't
// match any of its own options, rendering blank) — see the Library page,
// which drops an incompatible state rather than passing it through.
export function isRawStateValidForMediaType(state: LibraryRawState, mediaType: MediaType): boolean {
  if (state === "watchlist" || state === "backlog") return true;
  return mediaType === "movie" ? state === "watched" : state !== "watched";
}

export function normalizeLibrarySort(raw: string | string[] | undefined): LibrarySort {
  return firstValue(raw) === "added" ? "recently_added" : "recently_active";
}

// Grows in fixed page-size increments via "Load more" — see
// docs/library.md, "Pagination". Clamped so a hand-edited URL can't force
// an unbounded fetch.
const MAX_COUNT = LIBRARY_PAGE_SIZE * 20;

export function normalizeLibraryCount(raw: string | string[] | undefined): number {
  const value = firstValue(raw);
  const count = value ? Number.parseInt(value, 10) : LIBRARY_PAGE_SIZE;
  if (!Number.isInteger(count) || count < LIBRARY_PAGE_SIZE) return LIBRARY_PAGE_SIZE;
  return Math.min(count, MAX_COUNT);
}

// The state options relevant to the current type filter — never a
// chaotic single toolbar mixing every possible state (see
// docs/library.md, "State filtering"). "All" doesn't get a full raw-state
// dropdown at all (see the Library page) since Watched/Watching aren't a
// meaningful shared vocabulary across both media types.
export const MOVIE_STATE_OPTIONS: readonly { value: LibraryRawState; label: string }[] = [
  { value: "watchlist", label: "Watchlist" },
  { value: "backlog", label: "Backlog" },
  { value: "watched", label: "Watched" },
];

export const SHOW_STATE_OPTIONS: readonly { value: LibraryRawState; label: string }[] = [
  { value: "watchlist", label: "Watchlist" },
  { value: "backlog", label: "Backlog" },
  { value: "watching", label: "Watching" },
  { value: "on_hold", label: "On hold" },
  { value: "dropped", label: "Dropped" },
];
