import type { CalendarFilter, ReleaseEvent } from "./types";

// The one small session filter Calendar exposes (see docs/calendar.md,
// "Filtering") — a plain client-visible narrowing of an already-composed
// event list, never a separate query. Kept out of `compose.ts` so
// callers that want every event regardless of filter (e.g. Home's "N
// releases this week" hint) never have to reconstruct "all".
export function filterReleaseEvents(
  events: readonly ReleaseEvent[],
  filter: CalendarFilter,
): readonly ReleaseEvent[] {
  if (filter === "all") return events;
  const kind = filter === "tv" ? "episode" : "movieRelease";
  return events.filter((event) => event.kind === kind);
}
