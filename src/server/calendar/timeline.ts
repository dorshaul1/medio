import {
  CALENDAR_RECENT_WINDOW_DAYS,
  CALENDAR_THIS_WEEK_END_DAYS,
  CALENDAR_UPCOMING_HORIZON_DAYS,
} from "./constants";
import { daysBetween, parseDateOnly, todayParts } from "./date";
import { groupReleaseEvents } from "./group";
import { rankReleaseGroups } from "./rank";
import type { ReleaseEvent, ReleaseTimeline } from "./types";

// Composes a bounded, personally-relevant set of raw release events into
// the one projection Calendar's UI renders — see docs/calendar.md,
// "Release event projection". Pure: no I/O, no randomness. `now`/
// `useLocalTimezone` follow the same SSR-safe pattern
// `groupDiaryEntries` establishes (see date.ts) — `false` before a
// client component mounts (using the UTC stand-in so server and client
// agree on the very first render), `true` once the browser's real local
// day is known.
export function buildReleaseTimeline(
  events: readonly ReleaseEvent[],
  now: Date,
  useLocalTimezone: boolean,
): ReleaseTimeline {
  const today = todayParts(now, useLocalTimezone);

  const recent: ReleaseEvent[] = [];
  const todayEvents: ReleaseEvent[] = [];
  const tomorrow: ReleaseEvent[] = [];
  const thisWeek: ReleaseEvent[] = [];
  const later: ReleaseEvent[] = [];

  for (const event of events) {
    const delta = daysBetween(today, parseDateOnly(event.date));

    if (delta < 0) {
      // Older than the bounded recent window is never shown at all —
      // Calendar is not a release history (see docs/calendar.md,
      // "Past releases").
      if (delta >= -CALENDAR_RECENT_WINDOW_DAYS) recent.push(event);
      continue;
    }
    if (delta === 0) {
      todayEvents.push(event);
    } else if (delta === 1) {
      tomorrow.push(event);
    } else if (delta <= CALENDAR_THIS_WEEK_END_DAYS) {
      thisWeek.push(event);
    } else if (delta <= CALENDAR_UPCOMING_HORIZON_DAYS) {
      later.push(event);
    }
    // Beyond the horizon — never shown (see docs/calendar.md, "Upcoming window").
  }

  return {
    recent: rankReleaseGroups(groupReleaseEvents(recent)),
    today: rankReleaseGroups(groupReleaseEvents(todayEvents)),
    tomorrow: rankReleaseGroups(groupReleaseEvents(tomorrow)),
    thisWeek: rankReleaseGroups(groupReleaseEvents(thisWeek)),
    later: rankReleaseGroups(groupReleaseEvents(later)),
  };
}
