import { CalendarEventRow } from "@/features/calendar/calendar-event-row";
import type { ReleaseEvent, ReleaseEventGroup } from "@/server/calendar/types";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";

// Renders one already-grouped (same date + kind + identity — see
// server/calendar/group.ts) release. With Calendar's current data source
// (each show contributes at most one upcoming episode event and one
// recently-aired one, almost never on the same exact date — see
// docs/calendar.md, "Season-drop limitation"), a group is virtually
// always exactly one event; this still renders every event in a group
// rather than silently dropping any, so a genuine multi-episode release
// day is never flattened to just its first episode.
export function CalendarEventGroup({
  group,
  now,
  useLocalTimezone,
  spoilerProtection,
}: {
  group: ReleaseEventGroup;
  now: Date;
  useLocalTimezone: boolean;
  spoilerProtection: SpoilerProtectionValue;
}) {
  return (
    <>
      {group.events.map((event) => (
        <CalendarEventRow
          key={eventKey(event)}
          event={event}
          now={now}
          useLocalTimezone={useLocalTimezone}
          spoilerProtection={spoilerProtection}
        />
      ))}
    </>
  );
}

function eventKey(event: ReleaseEvent): string {
  return event.kind === "episode"
    ? `episode-${event.episodeProviderId}`
    : `movie-${event.movieProviderId}`;
}
