import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CalendarFilter, CalendarView } from "@/server/calendar/types";

// Calendar's one structural choice — Upcoming (the default chronological
// agenda) or Calendar (the compact month grid) — never Day/Week/Month/
// Year/Agenda like a generic calendar app (see docs/calendar.md,
// "Information architecture"). Same plain-navigation underline pattern
// `LibraryTypeToggle`/`DiaryFilterToggle` already use, not a client-side
// panel switch.
const OPTIONS: readonly { value: CalendarView; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "calendar", label: "Calendar" },
];

export function CalendarViewToggle({
  active,
  filter,
}: {
  active: CalendarView;
  filter: CalendarFilter;
}) {
  return (
    <nav aria-label="Calendar layout" className="flex items-center gap-5 border-b border-border">
      {OPTIONS.map((option) => {
        const isActive = option.value === active;
        const href = buildCalendarHref(option.value, filter);

        return (
          <Link
            key={option.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors",
              "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "border-primary text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

// `?view=` is always explicit here, even for "upcoming" — omitting it
// means "use my Default Calendar view preference" (see
// docs/settings.md), which is no longer always "upcoming" now that it's
// configurable. A toggle click has to pin the view the user actually
// picked, or clicking "Upcoming" would silently do nothing for someone
// whose stored default is "calendar".
export function buildCalendarHref(view: CalendarView, filter: CalendarFilter): Route {
  const params = new URLSearchParams({ view });
  if (filter !== "all") params.set("type", filter);
  return `/calendar?${params.toString()}` as Route;
}
