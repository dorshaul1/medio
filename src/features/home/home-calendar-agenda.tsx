import { getCalendarEvents } from "@/server/calendar/compose";
import type { HomeCalendarAgendaSize } from "@/server/home/layout";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import { HomeCalendarAgendaView } from "./home-calendar-agenda-view";

// The Calendar layout's (and Balanced's smaller teaser's) one data fetch
// — the exact same `getCalendarEvents` composition Calendar's own page
// calls, never a second Home-only calculation (see CLAUDE.md, "Calendar
// layout uses the canonical Calendar/Release Intelligence domain"). Its
// own Suspense boundary (see home-page.tsx) and its own failure boundary,
// same reasoning as `PersonalizedHomeSections`.
export async function HomeCalendarAgenda({
  size,
}: {
  size: Exclude<HomeCalendarAgendaSize, "none">;
}) {
  try {
    const [events, preferences] = await Promise.all([
      getCalendarEvents(new Date()),
      getCurrentUserPreferences(),
    ]);

    return (
      <HomeCalendarAgendaView
        events={events}
        spoilerProtection={preferences.spoilerProtection}
        size={size}
      />
    );
  } catch {
    return null;
  }
}
