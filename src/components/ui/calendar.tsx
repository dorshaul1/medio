"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { key: "sun", label: "S" },
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// A real month-grid date picker — no native `<input type="date">` chrome
// (which renders as the browser/OS's own generic control, inconsistent
// across platforms and visually foreign to the rest of the product) and
// no dependency: plain `Date` math is enough for a bounded single-month
// grid, so this doesn't reach for a calendar library for one popover.
// Selecting a day is the action — there's no separate "confirm" step
// once a day is clicked (see CLAUDE.md, "Confirmation Pattern").
export function Calendar({
  selected,
  onSelect,
  maxDate,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  maxDate?: Date;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selected ?? new Date()));
  const today = new Date();

  const firstWeekday = visibleMonth.getDay();
  const totalDays = daysInMonth(visibleMonth);
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: totalDays },
      (_, i) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), i + 1),
    ),
  ];

  function changeMonth(delta: number) {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const nextMonthDisabled = maxDate ? startOfMonth(visibleMonth) >= startOfMonth(maxDate) : false;

  return (
    <div className="flex w-64 flex-col gap-3">
      <div className="flex items-center justify-between">
        <IconButton
          aria-label="Previous month"
          variant="ghost"
          size="sm"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft />
        </IconButton>
        <p className="text-sm font-medium text-foreground">{monthLabel}</p>
        <IconButton
          aria-label="Next month"
          variant="ghost"
          size="sm"
          onClick={() => changeMonth(1)}
          disabled={nextMonthDisabled}
        >
          <ChevronRight />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday.key}
            className="flex h-8 items-center justify-center text-xs text-muted-foreground"
          >
            {weekday.label}
          </span>
        ))}
        {cells.map((date, index) =>
          date ? (
            <CalendarDay
              key={date.toISOString()}
              date={date}
              isSelected={selected !== null && isSameDay(date, selected)}
              isToday={isSameDay(date, today)}
              disabled={maxDate !== undefined && date.getTime() > maxDate.getTime()}
              onSelect={onSelect}
            />
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: static empty leading-week padding, never reordered
            <span key={index} />
          ),
        )}
      </div>
    </div>
  );
}

function CalendarDay({
  date,
  isSelected,
  isToday,
  disabled,
  onSelect,
}: {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  disabled: boolean;
  onSelect: (date: Date) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected}
      onClick={() => onSelect(date)}
      className={cn(
        "mx-auto flex size-8 items-center justify-center rounded-full text-sm text-foreground outline-none transition-colors",
        "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:text-muted-foreground/40",
        isSelected && "bg-primary text-primary-foreground hover:bg-primary-hover",
        !isSelected && isToday && "font-medium text-primary",
      )}
    >
      {date.getDate()}
    </button>
  );
}
