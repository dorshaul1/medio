import { SEARCH_MIN_QUERY_LENGTH } from "@/server/search/constants";

// Re-exported for existing importers — the canonical value now lives in
// server/search/constants.ts (Unified Search's own domain), shared with
// the compact suggestion surface (features/search/) rather than each
// defining its own threshold.
export const MIN_SEARCH_QUERY_LENGTH = SEARCH_MIN_QUERY_LENGTH;

// A `?q=` URL param is `string | string[] | undefined` (repeated `q=`
// params become an array) — this is the one place that gets normalized to
// a plain string, so nothing downstream has to think about the URL-param
// edge cases.
export function extractSearchQueryParam(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ?? "";
}

// Null means "not an active search" — below the minimum length (including
// empty/whitespace-only), so the page should show Discover's browsing
// collections instead of searching or showing an empty-query error.
export function normalizeSearchQuery(raw: string | string[] | undefined): string | null {
  const trimmed = extractSearchQueryParam(raw).trim();
  return trimmed.length >= MIN_SEARCH_QUERY_LENGTH ? trimmed : null;
}
