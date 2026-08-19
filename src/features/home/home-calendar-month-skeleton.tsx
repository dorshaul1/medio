import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const CELL_COUNT = 35;
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Matches `CalendarMonthView`'s real, full three-part shape exactly (see
// that component) — not just the day grid: its own month-label/nav-
// chevron header, then the weekday grid, then the always-present
// "selected day" section below it. Omitting either of the other two
// parts would make the skeleton noticeably shorter than any real render,
// which is the worst kind of hump (the page always grows once data
// arrives, never just shifts). The month label itself needs no fetch —
// it's derived from `now`, exactly like `HomeCalendarMonth`'s own real
// component — so it renders as real text immediately rather than a bar;
// the prev/next controls are real fixed-size `IconButton`s
// (`size="sm"`, 32px) worth matching in height even as inert bars. The
// day cells copy `CalendarMonthDayCell`'s real fixed `h-16 sm:h-20` —
// not an `aspect-square`, which would size differently at every column
// width and never actually match. The "selected day" list below is
// inherently data-dependent (which day, how many events) — two generic
// rows stand in for "there's always something here" rather than nothing.
export function HomeCalendarMonthSkeleton() {
  const now = new Date();
  const monthLabel = MONTH_LABEL_FORMATTER.format(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium tracking-tight">New &amp; upcoming</h2>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{monthLabel}</p>
          <div className="flex items-center gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: CELL_COUNT }, (_, index) => (
              // A static-length placeholder grid that never reorders —
              // index keys are the documented exception, not real data.
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
              <Skeleton key={index} className="h-16 w-full rounded-md sm:h-20" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24 rounded-sm" />
          <ul className="flex flex-col divide-y divide-border">
            {Array.from({ length: 2 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
              <li key={index} className="flex items-center gap-3 py-2.5">
                <Skeleton className="aspect-2/3 w-12 shrink-0 rounded-md sm:w-14" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Skeleton className="h-5 w-2/3 rounded-sm" />
                  <Skeleton className="h-4 w-1/3 rounded-sm" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
