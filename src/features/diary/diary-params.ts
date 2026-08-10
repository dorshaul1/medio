import type { DiaryFilter, DiarySort } from "@/server/diary/types";

// The Diary's URL-addressable browsing state — see docs/diary.md,
// "Filtering". An invalid/missing value always falls back to a sensible
// default rather than rejecting the request, the same convention
// `features/library/library-params.ts` uses.

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

// "tv" (not "episodes") is the product-facing filter language this
// application already uses for episode viewing events — see CLAUDE.md,
// "Diary".
export function normalizeDiaryFilter(raw: string | string[] | undefined): DiaryFilter {
  const value = firstValue(raw);
  return value === "movies" || value === "tv" ? value : "all";
}

export function normalizeDiarySort(raw: string | string[] | undefined): DiarySort {
  return firstValue(raw) === "oldest" ? "oldest" : "newest";
}
