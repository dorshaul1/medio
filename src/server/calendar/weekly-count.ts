import "server-only";
import { getCalendarEvents } from "./compose";
import { buildReleaseTimeline } from "./timeline";

// Home's one compact Calendar signal — "N releases this week" (see
// docs/calendar.md, "Home integration") — never the whole agenda
// duplicated on Home. Counts *groups* (what the user will actually see
// as distinct rows on Calendar), not raw events, and deliberately
// excludes "Recently released": this is a forward-looking teaser, not a
// missed-releases prompt (that's Calendar's own "Recently released"
// section). `useLocalTimezone: false` — Home is server-rendered with no
// client mount step of its own for this hint, so this uses the same
// UTC-stand-in bucketing basis `date.ts` documents; a date landing right
// at a timezone-offset boundary could occasionally count one release a
// day early/late, an acceptable approximation for a teaser count (the
// real Calendar page itself always resolves the correct local bucket).
export async function getWeeklyReleaseCount(now: Date): Promise<number> {
  const events = await getCalendarEvents(now);
  const timeline = buildReleaseTimeline(events, now, false);
  return timeline.today.length + timeline.tomorrow.length + timeline.thisWeek.length;
}
