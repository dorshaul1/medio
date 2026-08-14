import { CalendarMonthView } from "@/features/calendar/calendar-month-view";
import { getCalendarEvents } from "@/server/calendar/compose";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

// The Calendar layout's "full calendar" body option — see docs/home.md,
// "Calendar layout". Reuses `CalendarMonthView` (the exact same month
// grid Calendar's own page renders) completely unchanged, always showing
// the current month: Home never grows its own `?month=` navigation state,
// so the grid's own month-navigation chevrons/Today link (`monthHref`,
// see `calendar-month-view.tsx`) hand off to the real
// `/calendar?view=calendar` page whenever the user actually navigates to
// a different month. Its own Suspense boundary (see home-page.tsx) and
// its own failure boundary, same reasoning as `HomeCalendarAgenda`.
export async function HomeCalendarMonth() {
  try {
    const now = new Date();
    const [events, preferences] = await Promise.all([
      getCalendarEvents(now),
      getCurrentUserPreferences(),
    ]);

    return (
      <section aria-labelledby="home-calendar" className="flex flex-col gap-4">
        <h2 id="home-calendar" className="text-lg font-medium tracking-tight">
          New &amp; upcoming
        </h2>
        <CalendarMonthView
          events={events}
          filter="all"
          spoilerProtection={preferences.spoilerProtection}
          year={now.getUTCFullYear()}
          month={now.getUTCMonth() + 1}
        />
      </section>
    );
  } catch {
    return null;
  }
}
