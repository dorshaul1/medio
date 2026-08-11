import type { Route } from "next";
import Link from "next/link";
import type { ActivityBucket, ViewingRhythm } from "@/server/stats/types";

// A restrained viewing-rhythm chart — see docs/stats.md, "Viewing rhythm
// and range". Plain divs, no chart library: height alone carries the
// visual comparison (decorative, `aria-hidden`), while every column also
// carries a real, exact sr-only value so a screen reader gets the same
// information a sighted user reads from bar height, never an unlabeled
// SVG shape. Neutral tone throughout — this is a behavioral rhythm, not
// a primary action, so Clay stays reserved. Bucket granularity (day/
// month/year) varies with the selected range — the chart itself doesn't
// care, it only ever renders whatever `ActivityBucket[]` it's given.
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// A month bucket's `key` is always `"{year}-{month}"` (see
// `toActivityBuckets`) — enough to reconstruct a fully qualified "August
// 2026" even though the on-chart visible label stays short ("Aug") to
// avoid crowding 12 columns. Used both for the sr-only per-bar text and
// the "busiest month → Diary" link, so neither loses year context a
// rolling 12-month window (which can span two calendar years) needs.
function monthYearFromKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return MONTH_YEAR_FORMAT.format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1)));
}

function bucketAccessibleLabel(
  bucket: ActivityBucket,
  granularity: NonNullable<ViewingRhythm>["granularity"],
): string {
  const noun = bucket.eventCount === 1 ? "viewing" : "viewings";
  const subject =
    granularity === "day"
      ? `Day ${bucket.label}`
      : granularity === "month"
        ? monthYearFromKey(bucket.key)
        : bucket.label;
  return `${subject}: ${bucket.eventCount} ${noun}`;
}

// The single busiest month, when the chart is month-granularity — links
// straight into that month's real chronology in Diary (see
// docs/stats.md, "Stats + Diary"). Never shown for day/year granularity,
// where "a month" isn't the unit being charted at all.
function busiestMonthHref(bucket: ActivityBucket): Route {
  const [year, month] = bucket.key.split("-");
  return `/library/diary?month=${year}-${String(month).padStart(2, "0")}` as Route;
}

export function StatsTimeline({ rhythm }: { rhythm: ViewingRhythm }) {
  // A single bucket (e.g. "All time" with real history in only one
  // calendar year so far) has no rhythm to show — one bar filling the
  // whole width reads as a broken/loading chart, not a comparison, so
  // the section omits itself entirely rather than render one.
  if (
    !rhythm ||
    rhythm.buckets.length < 2 ||
    rhythm.buckets.every((bucket) => bucket.eventCount === 0)
  ) {
    return null;
  }
  const { granularity, buckets } = rhythm;

  const max = Math.max(...buckets.map((bucket) => bucket.eventCount), 1);
  const busiest =
    granularity === "month"
      ? [...buckets].sort((a, b) => b.eventCount - a.eventCount)[0]
      : undefined;
  const busiestIsMeaningful = busiest && busiest.eventCount > 0;

  return (
    <section aria-labelledby="stats-timeline" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="stats-timeline" className="text-lg font-medium tracking-tight">
          Viewing rhythm
        </h2>
        {busiestIsMeaningful ? (
          <Link
            href={busiestMonthHref(busiest)}
            className="rounded-sm text-sm text-muted-foreground underline outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {monthYearFromKey(busiest.key)} in Diary
          </Link>
        ) : null}
      </div>
      <div className="flex items-end gap-1 sm:gap-2">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="flex flex-1 flex-col items-center gap-2">
            <div aria-hidden="true" className="flex h-24 w-full items-end">
              <div
                className="w-full rounded-sm bg-foreground/70"
                style={{ height: `${Math.max(2, (bucket.eventCount / max) * 100)}%` }}
              />
            </div>
            {granularity !== "day" ? (
              <span aria-hidden="true" className="text-[0.65rem] text-muted-foreground">
                {bucket.label}
              </span>
            ) : null}
            <span className="sr-only">{bucketAccessibleLabel(bucket, granularity)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
