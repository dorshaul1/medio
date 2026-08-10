import type { CalendarFilter, CalendarView } from "@/server/calendar/types";

// Calendar's URL-addressable session state (view + filter) — never
// React-state-only (see CLAUDE.md, "Media UI"). An invalid/missing value
// always falls back to a sensible default, the same convention
// `features/diary/diary-params.ts` uses.

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

// `fallback` is what renders when `?view=` is absent — the user's
// "Default Calendar view" preference (see docs/settings.md), defaulting
// to "upcoming" for callers (and tests) that don't have one on hand. An
// explicit, invalid, or missing `?view=` never errors; it just falls
// back — same convention `normalizeDiscoverMediaType` uses for
// Discover's own default-view preference.
export function normalizeCalendarView(
  raw: string | string[] | undefined,
  fallback: CalendarView = "upcoming",
): CalendarView {
  const value = firstValue(raw);
  return value === "calendar" || value === "upcoming" ? value : fallback;
}

export function normalizeCalendarFilter(raw: string | string[] | undefined): CalendarFilter {
  const value = firstValue(raw);
  return value === "tv" || value === "movies" ? value : "all";
}
