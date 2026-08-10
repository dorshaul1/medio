"use client";

import { useEffect, useState } from "react";
import { CalendarEmptyState } from "@/features/calendar/calendar-empty-state";
import { CalendarSection } from "@/features/calendar/calendar-section";
import { buildReleaseTimeline } from "@/server/calendar/timeline";
import type { CalendarFilter, ReleaseEvent } from "@/server/calendar/types";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";

const SECTIONS: readonly { id: keyof ReturnType<typeof buildReleaseTimeline>; label: string }[] = [
  { id: "recent", label: "Recently released" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "thisWeek", label: "This week" },
  { id: "later", label: "Later" },
];

// Calendar's default agenda layout — a chronological, artwork-led list
// grouped into Recently released/Today/Tomorrow/This week/Later, never a
// dense bordered grid (see docs/calendar.md, "Information architecture").
// The only genuinely client-side concern is local-timezone date bucketing
// (see `mounted`, the same SSR-safe pattern `DiaryTimeline` already
// uses) — data fetching/hydration/authorization stay entirely
// server-side; this only ever receives already-composed events.
export function CalendarUpcoming({
  events,
  filter,
  spoilerProtection,
}: {
  events: readonly ReleaseEvent[];
  filter: CalendarFilter;
  spoilerProtection: SpoilerProtectionValue;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // `new Date()` read directly in the render body, same as
  // `DiaryTimeline`'s own grouping call — bucketing only cares about
  // calendar-day boundaries, not sub-day precision, so re-reading it on
  // every render carries no real risk beyond an extremely rare
  // midnight-boundary edge case this codebase already accepts elsewhere.
  const now = new Date();
  const timeline = buildReleaseTimeline(events, now, mounted);

  const isEmpty = SECTIONS.every((section) => timeline[section.id].length === 0);
  if (isEmpty) {
    return (
      <CalendarEmptyState
        heading={
          filter === "all"
            ? "Nothing on your calendar yet."
            : `No upcoming ${filter === "tv" ? "episodes" : "movies"} right now.`
        }
        description={
          filter === "all"
            ? "Track a show, or save a title to Watchlist/Backlog, to see when something new is available."
            : "Try switching the filter, or check back once something's scheduled."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map((section) => (
        <CalendarSection
          key={section.id}
          id={section.id}
          label={section.label}
          groups={timeline[section.id]}
          now={now}
          useLocalTimezone={mounted}
          spoilerProtection={spoilerProtection}
        />
      ))}
    </div>
  );
}
