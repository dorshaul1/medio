import type { Route } from "next";
import { LinkTabs } from "@/components/ui/link-tabs";
import type { CalendarFilter, CalendarView } from "@/server/calendar/types";

// Calendar's one structural choice — Upcoming (the default chronological
// agenda) or Calendar (the compact month grid) — never Day/Week/Month/
// Year/Agenda like a generic calendar app (see docs/calendar.md,
// "Information architecture").
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
    <LinkTabs
      ariaLabel="Calendar layout"
      active={active}
      items={OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        href: buildCalendarHref(option.value, filter),
      }))}
    />
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
