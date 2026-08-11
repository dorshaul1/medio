import { parseMonthParam } from "@/lib/month";
import type { DiaryFilter, DiaryPeriod, DiarySort } from "@/server/diary/types";

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

// `?month=YYYY-MM` — Diary 2.0's default browsing scope (see
// docs/diary.md, "Month-scoped querying"). An invalid/missing value
// falls back to `now`'s own UTC calendar month, the same "today's
// month, computed in UTC" default Calendar's own `?month=` param uses
// (`app/(app)/calendar/page.tsx`) — never a real local-timezone
// computation server-side (see `DiaryPeriod`'s own comment for why).
export function normalizeDiaryPeriod(raw: string | string[] | undefined, now: Date): DiaryPeriod {
  const value = firstValue(raw);
  const parsed = value ? parseMonthParam(value) : null;
  return parsed ?? { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}
