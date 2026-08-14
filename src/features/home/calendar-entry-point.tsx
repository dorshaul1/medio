import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getWeeklyReleaseCount } from "@/server/calendar/weekly-count";

// Home's other entry point (beside Pick — see `pick-entry-point.tsx`),
// same restrained icon+text action, same reasoning: a deliberate,
// occasional destination, not a promoted banner (see CLAUDE.md,
// "Application shell" — Calendar stays out of primary nav). The one
// thing this adds beyond a plain link is the compact "N this week" count.
// The Calendar Home layout (and Balanced's smaller teaser) do surface a
// real, bounded release agenda directly on Home itself now (see
// `HomeCalendarAgenda`, docs/calendar.md, "Home integration") — this
// header link stays the one constant way into the *full*, unbounded
// Calendar page regardless of Home layout. Its own async Server
// Component/Suspense boundary (see `app/(app)/page.tsx`) so a slower
// Calendar fetch never delays the rest of Home's header.
export async function CalendarEntryPoint() {
  const count = await getWeeklyReleaseCount(new Date());

  return (
    <Button asChild variant="outline">
      <Link href="/calendar">
        <CalendarDays /> Calendar{count > 0 ? ` · ${count} this week` : ""}
      </Link>
    </Button>
  );
}

// The header renders this immediately while `CalendarEntryPoint`'s own
// fetch is still in flight — same link, just without the count, so the
// destination is never gated behind that fetch.
export function CalendarEntryPointFallback() {
  return (
    <Button asChild variant="outline">
      <Link href="/calendar">
        <CalendarDays /> Calendar
      </Link>
    </Button>
  );
}
