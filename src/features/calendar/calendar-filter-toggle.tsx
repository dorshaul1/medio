import Link from "next/link";
import { buildCalendarHref } from "@/features/calendar/calendar-view-toggle";
import { cn } from "@/lib/utils";
import type { CalendarFilter, CalendarView } from "@/server/calendar/types";

// The one small session filter Calendar exposes — at most All/TV/Movies,
// never a search box or a full filter toolbar (see docs/calendar.md,
// "Filtering"). Deliberately lighter-weight than `CalendarViewToggle`'s
// underlined tabs — this is a secondary narrowing, not a second
// competing structural choice.
const OPTIONS: readonly { value: CalendarFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tv", label: "TV" },
  { value: "movies", label: "Movies" },
];

export function CalendarFilterToggle({
  active,
  view,
}: {
  active: CalendarFilter;
  view: CalendarView;
}) {
  return (
    <nav aria-label="Media type" className="flex items-center gap-3">
      {OPTIONS.map((option, index) => {
        const isActive = option.value === active;
        return (
          <span key={option.value} className="flex items-center gap-3">
            {index > 0 ? (
              <span aria-hidden="true" className="text-muted-foreground/40">
                ·
              </span>
            ) : null}
            <Link
              href={buildCalendarHref(view, option.value)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-sm text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
