"use client";

import { useEffect, useState } from "react";
import { CalendarEventGroup } from "@/features/calendar/calendar-event-group";
import { CalendarSection } from "@/features/calendar/calendar-section";
import { releaseEventGroupKey } from "@/server/calendar/group";
import { buildReleaseTimeline } from "@/server/calendar/timeline";
import type { ReleaseEvent } from "@/server/calendar/types";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";
import { buildHomeCalendarAgenda, buildHomeCalendarPreview } from "@/server/home/calendar-agenda";
import { HOME_CALENDAR_LATER_LIMIT, HOME_CALENDAR_PREVIEW_LIMIT } from "@/server/home/constants";
import type { HomeCalendarAgendaSize } from "@/server/home/layout";

// The Calendar layout's release-first Home body, and Balanced's smaller
// teaser of the same idea — see docs/home.md, "Calendar layout"/
// "Balanced layout". The only genuinely client-side concern is
// local-timezone date bucketing (the same SSR-safe `mounted` pattern
// `CalendarUpcoming` already establishes) — every event was already
// composed server-side by the exact same Calendar domain Calendar's own
// page uses; this only ever re-buckets/renders what it's given.
export function HomeCalendarAgendaView({
  events,
  spoilerProtection,
  size,
}: {
  events: readonly ReleaseEvent[];
  spoilerProtection: SpoilerProtectionValue;
  size: Exclude<HomeCalendarAgendaSize, "none">;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const timeline = buildReleaseTimeline(events, now, mounted);

  if (size === "preview") {
    const preview = buildHomeCalendarPreview(timeline, HOME_CALENDAR_PREVIEW_LIMIT);
    if (preview.length === 0) return null;

    return (
      <section aria-labelledby="home-calendar-preview" className="flex flex-col gap-3">
        <h2 id="home-calendar-preview" className="text-lg font-medium tracking-tight">
          Coming up
        </h2>
        <ul className="flex flex-col divide-y divide-border">
          {preview.map((group) => (
            <CalendarEventGroup
              key={releaseEventGroupKey(group)}
              group={group}
              now={now}
              useLocalTimezone={mounted}
              spoilerProtection={spoilerProtection}
            />
          ))}
        </ul>
      </section>
    );
  }

  const agenda = buildHomeCalendarAgenda(timeline, HOME_CALENDAR_LATER_LIMIT);
  const isEmpty =
    agenda.today.length === 0 && agenda.thisWeek.length === 0 && agenda.later.length === 0;

  return (
    <section aria-labelledby="home-calendar" className="flex flex-col gap-6">
      <h2 id="home-calendar" className="text-lg font-medium tracking-tight">
        New &amp; upcoming
      </h2>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground">
          Nothing new right now. Track a show, or save something to Watchlist/Backlog, to see it
          here.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <CalendarSection
            id="home-calendar-today"
            label="Today"
            groups={agenda.today}
            now={now}
            useLocalTimezone={mounted}
            spoilerProtection={spoilerProtection}
          />
          <CalendarSection
            id="home-calendar-this-week"
            label="This week"
            groups={agenda.thisWeek}
            now={now}
            useLocalTimezone={mounted}
            spoilerProtection={spoilerProtection}
          />
          <CalendarSection
            id="home-calendar-later"
            label="Later"
            groups={agenda.later}
            now={now}
            useLocalTimezone={mounted}
            spoilerProtection={spoilerProtection}
          />
        </div>
      )}
    </section>
  );
}
