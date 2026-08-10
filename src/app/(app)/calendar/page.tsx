import type { Metadata } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { CalendarFilterToggle } from "@/features/calendar/calendar-filter-toggle";
import { CalendarMonthView } from "@/features/calendar/calendar-month-view";
import {
  normalizeCalendarFilter,
  normalizeCalendarView,
} from "@/features/calendar/calendar-params";
import { CalendarUpcoming } from "@/features/calendar/calendar-upcoming";
import { CalendarViewToggle } from "@/features/calendar/calendar-view-toggle";
import { getCalendarEvents } from "@/server/calendar/compose";
import { filterReleaseEvents } from "@/server/calendar/filter";
import { parseMonthParam } from "@/server/calendar/month-grid";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

export const metadata: Metadata = {
  title: "Calendar",
};

// Calendar's "Personal Release Intelligence" surface — see
// docs/calendar.md. Server-first, same as Diary/Library: view/filter/
// month live in the URL, the full bounded event set is fetched and
// composed on the server, and only local-timezone date grouping needs
// the browser at all (see `CalendarUpcoming`/`CalendarMonthView`).
export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams;
  const filter = normalizeCalendarFilter(params.type);

  const now = new Date();
  const [events, { spoilerProtection, calendarDefaultView }] = await Promise.all([
    getCalendarEvents(now),
    getCurrentUserPreferences(),
  ]);
  // An explicit `?view=` always wins; otherwise falls back to the user's
  // own "Default Calendar view" preference (see docs/settings.md), never
  // a hardcoded "Upcoming" — same convention Discover's own default-type
  // preference uses.
  const view = normalizeCalendarView(params.view, calendarDefaultView);
  const filteredEvents = filterReleaseEvents(events, filter);

  const requestedMonth = typeof params.month === "string" ? parseMonthParam(params.month) : null;
  const defaultMonth = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const { year, month } = requestedMonth ?? defaultMonth;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Calendar"
          description="What's newly available, and what's coming up, for the shows and movies you care about."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <CalendarViewToggle active={view} filter={filter} />
          <CalendarFilterToggle active={filter} view={view} />
        </div>

        {view === "upcoming" ? (
          <CalendarUpcoming
            events={filteredEvents}
            filter={filter}
            spoilerProtection={spoilerProtection}
          />
        ) : (
          <CalendarMonthView
            events={filteredEvents}
            filter={filter}
            spoilerProtection={spoilerProtection}
            year={year}
            month={month}
          />
        )}
      </div>
    </PageContainer>
  );
}
