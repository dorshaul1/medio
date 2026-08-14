// Home's own Calendar presentation, built entirely on top of Calendar's
// existing composed, ranked output — see docs/home.md, "Calendar
// layout", and CLAUDE.md, "Home": "Reuse the SAME Calendar / Release
// Intelligence domain and eligibility logic." Nothing here computes a new
// event, a new eligibility rule, or a new ranking — both functions below
// only ever re-bucket/cap `ReleaseTimeline`'s already-decided groups (see
// `server/calendar/timeline.ts`).
import { rankReleaseGroups } from "@/server/calendar/rank";
import type { ReleaseEventGroup, ReleaseTimeline } from "@/server/calendar/types";

export type HomeCalendarAgenda = {
  today: readonly ReleaseEventGroup[];
  thisWeek: readonly ReleaseEventGroup[];
  later: readonly ReleaseEventGroup[];
};

// The Calendar layout's full agenda — Calendar's finer five buckets
// consolidated into the Today/This week/Later shape the phase spec asks
// for. "Today" folds in "Recently released" (still-unwatched items inside
// Calendar's short recovery window) — both answer the same question on
// Home ("what's new or coming right now"), so they never need two
// separate headings here the way Calendar's own page keeps them apart.
// "This week" folds in "Tomorrow". "Later" is capped to `laterLimit` —
// Home's agenda is a bounded preview, never Calendar's full 90-day
// horizon; the header's own Calendar entry point
// (`features/home/calendar-entry-point.tsx`) is the one constant way
// into the full page.
export function buildHomeCalendarAgenda(
  timeline: ReleaseTimeline,
  laterLimit: number,
): HomeCalendarAgenda {
  return {
    today: rankReleaseGroups([...timeline.recent, ...timeline.today]),
    thisWeek: rankReleaseGroups([...timeline.tomorrow, ...timeline.thisWeek]),
    later: timeline.later.slice(0, laterLimit),
  };
}

// Balanced layout's much smaller "a restrained amount of discovery"
// teaser — a flat, header-less list capped at `limit`, favoring what's
// most immediate exactly as `rankReleaseGroups` already orders it. Never
// reaches into "Later" — a teaser has no business surfacing something 90
// days out.
export function buildHomeCalendarPreview(
  timeline: ReleaseTimeline,
  limit: number,
): readonly ReleaseEventGroup[] {
  const combined = rankReleaseGroups([
    ...timeline.recent,
    ...timeline.today,
    ...timeline.tomorrow,
    ...timeline.thisWeek,
  ]);
  return combined.slice(0, limit);
}
