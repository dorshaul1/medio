import type { ReleaseEvent, ReleaseEventGroup } from "./types";

function eventIdentity(event: ReleaseEvent): number {
  return event.kind === "episode" ? event.showProviderId : event.movieProviderId;
}

// A stable React `key` for one group — same identity basis grouping
// itself uses, so UI code never has to re-derive it (and risk drifting
// from the actual grouping rule).
export function releaseEventGroupKey(group: ReleaseEventGroup): string {
  const [first] = group.events;
  if (!first) return group.date;
  return `${group.date}:${first.kind}:${eventIdentity(first)}`;
}

// Collapses same-title, same-date raw events into one group — UI never
// renders one row per raw event when more than one lands on the same
// day for the same show/movie (see docs/calendar.md, "Grouping"). True
// same-day multi-episode/season-drop detection is a deliberately
// deferred enhancement (see docs/calendar.md, "Known limitations") —
// this still correctly collapses whatever raw events composition *did*
// produce for one title+date, regardless of how many.
export function groupReleaseEvents(events: readonly ReleaseEvent[]): ReleaseEventGroup[] {
  const groups = new Map<string, ReleaseEventGroup>();

  for (const event of events) {
    const key = `${event.date}:${event.kind}:${eventIdentity(event)}`;
    const existing = groups.get(key);
    if (existing) {
      groups.set(key, { ...existing, events: [...existing.events, event] });
    } else {
      groups.set(key, { date: event.date, events: [event] });
    }
  }

  return [...groups.values()];
}
