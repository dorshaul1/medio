import type { DiscoverSort } from "@/server/tmdb/queries";

// Discover's Movies/Shows browse mode — URL-addressable via `?type=`.
export type DiscoverMediaType = "movies" | "shows";

function isDiscoverMediaType(value: string | undefined): value is DiscoverMediaType {
  return value === "movies" || value === "shows";
}

// `fallback` is what renders when `?type=` is absent — the user's
// "Default Discover view" preference (see docs/settings.md), defaulting
// to "movies" for callers (and tests) that don't have one on hand. An
// explicit, invalid, or missing `?type=` never 400s; it just falls back.
export function normalizeDiscoverMediaType(
  raw: string | string[] | undefined,
  fallback: DiscoverMediaType = "movies",
): DiscoverMediaType {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isDiscoverMediaType(value) ? value : fallback;
}

function isDiscoverSort(value: string | undefined): value is DiscoverSort {
  return value === "popular" || value === "top_rated" || value === "newest";
}

// An invalid/missing `?sort=` falls back to "popular" rather than
// rejecting the request — a genre page should never 400 over a stray
// query param.
export function normalizeDiscoverSort(raw: string | string[] | undefined): DiscoverSort {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isDiscoverSort(value) ? value : "popular";
}

export const DISCOVER_SORT_OPTIONS: readonly { value: DiscoverSort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

// A genre page's `?page=` — clamped to a sane positive integer rather
// than passing whatever a user typed straight to TMDB.
export function normalizeDiscoverPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = value ? Number.parseInt(value, 10) : 1;
  return Number.isInteger(page) && page > 0 ? page : 1;
}
