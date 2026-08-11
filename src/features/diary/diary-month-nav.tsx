"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addMonths, formatMonthParam } from "@/lib/month";
import { cn } from "@/lib/utils";
import type { DiaryFilter, DiaryMonthActivity, DiaryPeriod, DiarySort } from "@/server/diary/types";
import { formatDiaryMonthLabel } from "./diary-month-format";

const MONTH_ABBR_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

export function diaryMonthHref(period: DiaryPeriod, filter: DiaryFilter, sort: DiarySort): Route {
  const params = new URLSearchParams({ month: formatMonthParam(period) });
  if (filter !== "all") params.set("type", filter);
  if (sort === "oldest") params.set("sort", "oldest");
  return `/library/diary?${params.toString()}` as Route;
}

// Diary 2.0's date navigation — prev/next chevrons, a "Today" return
// control, and a compact month/year picker — deliberately not a Day/
// Week/Month/Quarter/Year tab system (see docs/diary.md, "Month
// navigation"). Mirrors `CalendarMonthView`'s own header nav (same
// chevron/Today pattern) for one consistent date-navigation language
// across the app, adapted for Diary's own real-history-only picker.
export function DiaryMonthNav({
  period,
  filter,
  sort,
  activity,
  now,
}: {
  period: DiaryPeriod;
  filter: DiaryFilter;
  sort: DiarySort;
  activity: readonly DiaryMonthActivity[];
  now: Date;
}) {
  // Diary's month boundary is UTC (see docs/diary.md, "Month navigation
  // and timezone") — the nav's own "is this the current month" and
  // picker highlighting stay on that same basis, not a post-mount local
  // reconciliation, since nothing here claims real-time-of-day precision
  // the way per-entry "Today"/"Yesterday" labels do.
  const today: DiaryPeriod = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const isCurrentMonth = period.year === today.year && period.month === today.month;
  const isAtOrPastCurrentMonth =
    period.year > today.year || (period.year === today.year && period.month >= today.month);

  const previous = addMonths(period, -1);
  const next = addMonths(period, 1);

  // Only years with real watch history are ever offered — see
  // docs/diary.md, "Month navigation": a picker full of guaranteed-empty
  // years would be noise, not a helpful shortcut.
  const activeYears = [...new Set(activity.map((entry) => entry.year))].sort((a, b) => b - a);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(period.year);
  const monthsWithActivity = new Set(
    activity
      .filter(
        (entry) => entry.year === pickerYear && (entry.movieCount > 0 || entry.episodeCount > 0),
      )
      .map((entry) => entry.month),
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <Popover
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (open) setPickerYear(period.year);
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 px-2 font-medium">
            <CalendarDays aria-hidden="true" className="size-4" />
            {formatDiaryMonthLabel(period)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Jump to month</p>
          {activeYears.length > 1 ? (
            <div className="mb-3 flex flex-wrap gap-1">
              {activeYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={year === pickerYear}
                  onClick={() => setPickerYear(year)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    year === pickerYear
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-4 gap-1">
            {MONTH_NUMBERS.map((month) => {
              const hasActivity = monthsWithActivity.has(month);
              const isSelected = pickerYear === period.year && month === period.month;
              return (
                <Link
                  key={month}
                  href={diaryMonthHref({ year: pickerYear, month }, filter, sort)}
                  onClick={() => setPickerOpen(false)}
                  aria-current={isSelected ? "date" : undefined}
                  className={cn(
                    "rounded-md py-1.5 text-center text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : hasActivity
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/40 hover:bg-muted",
                  )}
                >
                  {MONTH_ABBR_FORMATTER.format(new Date(Date.UTC(2000, month - 1, 1)))}
                </Link>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1">
        {!isCurrentMonth ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={diaryMonthHref(today, filter, sort)}>Today</Link>
          </Button>
        ) : null}
        <IconButton aria-label="Previous month" variant="ghost" size="sm" asChild>
          <Link href={diaryMonthHref(previous, filter, sort)}>
            <ChevronLeft />
          </Link>
        </IconButton>
        {isAtOrPastCurrentMonth ? (
          <IconButton aria-label="Next month" variant="ghost" size="sm" disabled>
            <ChevronRight />
          </IconButton>
        ) : (
          <IconButton aria-label="Next month" variant="ghost" size="sm" asChild>
            <Link href={diaryMonthHref(next, filter, sort)}>
              <ChevronRight />
            </Link>
          </IconButton>
        )}
      </div>
    </div>
  );
}
