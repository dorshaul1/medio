"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { CalendarEmptyState } from "@/features/calendar/calendar-empty-state";
import { CalendarEventGroup } from "@/features/calendar/calendar-event-group";
import { CalendarMonthDayCell } from "@/features/calendar/calendar-month-day-cell";
import { addMonths } from "@/lib/month";
import { formatReleaseDate, todayParts } from "@/server/calendar/date";
import { groupReleaseEvents, releaseEventGroupKey } from "@/server/calendar/group";
import { buildMonthGrid, formatMonthDateOnly } from "@/server/calendar/month-grid";
import { rankReleaseGroups } from "@/server/calendar/rank";
import type { CalendarFilter, ReleaseEvent } from "@/server/calendar/types";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthHref(year: number, month: number, filter: CalendarFilter): Route {
  const params = new URLSearchParams({
    view: "calendar",
    month: `${year}-${String(month).padStart(2, "0")}`,
  });
  if (filter !== "all") params.set("type", filter);
  return `/calendar?${params.toString()}` as Route;
}

// Calendar's secondary, compact spatial view — a quiet month grid, never
// a dense bordered office-calendar table: no per-category *colors*, no
// time-of-day columns, no draggable events (see docs/calendar.md,
// "Visual system"). Each day cell (`CalendarMonthDayCell`) already shows
// what's on it — a single release's own backdrop + title, or Tv/
// Clapperboard kind icons for more than one — without needing a click;
// the actual releases for the selected day still render as the same
// event rows the Upcoming agenda uses, just below the grid.
export function CalendarMonthView({
  events,
  filter,
  spoilerProtection,
  year,
  month,
}: {
  events: readonly ReleaseEvent[];
  filter: CalendarFilter;
  spoilerProtection: SpoilerProtectionValue;
  year: number;
  month: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const today = todayParts(now, mounted);
  const todayDateOnly = formatMonthDateOnly(today.year, today.month, today.day);

  const grid = useMemo(
    () => buildMonthGrid(year, month, todayDateOnly),
    [year, month, todayDateOnly],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ReleaseEvent[]>();
    for (const event of events) {
      const existing = map.get(event.date);
      if (existing) existing.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [events]);

  const defaultSelected = grid.some((cell) => cell.date === todayDateOnly && cell.inCurrentMonth)
    ? todayDateOnly
    : formatMonthDateOnly(year, month, 1);
  const [selectedDate, setSelectedDate] = useState(defaultSelected);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const selectedGroups = rankReleaseGroups(groupReleaseEvents(selectedEvents));

  const previous = addMonths({ year, month }, -1);
  const next = addMonths({ year, month }, 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)))}
        </p>
        <div className="flex items-center gap-1">
          {/* Only offered when it would actually go somewhere — no dead
              control sitting next to the chevrons while already viewing
              the current month. */}
          {year !== today.year || month !== today.month ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={monthHref(today.year, today.month, filter)}>Today</Link>
            </Button>
          ) : null}
          <IconButton aria-label="Previous month" variant="ghost" size="sm" asChild>
            <Link href={monthHref(previous.year, previous.month, filter)}>
              <ChevronLeft />
            </Link>
          </IconButton>
          <IconButton aria-label="Next month" variant="ghost" size="sm" asChild>
            <Link href={monthHref(next.year, next.month, filter)}>
              <ChevronRight />
            </Link>
          </IconButton>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} aria-hidden="true">
              {label}
            </span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((cell) => (
            <CalendarMonthDayCell
              key={cell.date}
              cell={cell}
              events={eventsByDate.get(cell.date) ?? []}
              isSelected={cell.date === selectedDate}
              dateLabel={formatReleaseDate(cell.date, now, mounted)}
              onSelect={() => setSelectedDate(cell.date)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {formatReleaseDate(selectedDate, now, mounted)}
        </h2>
        {selectedGroups.length === 0 ? (
          <CalendarEmptyState
            heading="Nothing this day."
            description="Pick another day to see what's on it."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {selectedGroups.map((group) => (
              <CalendarEventGroup
                key={releaseEventGroupKey(group)}
                group={group}
                now={now}
                useLocalTimezone={mounted}
                spoilerProtection={spoilerProtection}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
