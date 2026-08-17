import type { ActivityBucket, WeekdayRhythm } from "@/server/stats/types";

// A small day-of-week breakdown — see docs/stats.md, "Viewing rhythm and
// range". Same restrained bar treatment as `StatsTimeline` (height only,
// `aria-hidden`, exact sr-only counts) rather than a second, competing
// chart style. Omits itself entirely below the minimum sample size or
// for "All time" (no raw timestamps fetched there) — see
// `computeWeekdayActivity`.
export function StatsWeekdaySection({ weekday }: { weekday: WeekdayRhythm }) {
  if (!weekday || weekday.buckets.every((bucket) => bucket.eventCount === 0)) return null;

  const { mostActiveDay, buckets } = weekday;
  const max = Math.max(...buckets.map((bucket) => bucket.eventCount), 1);

  return (
    <section aria-labelledby="stats-weekday" className="flex flex-col gap-3">
      <h2 id="stats-weekday" className="text-sm font-medium text-muted-foreground">
        {mostActiveDay ? `${mostActiveDay} is your most active viewing day` : "When you watch"}
      </h2>
      <div className="flex items-end gap-2 sm:gap-3">
        {buckets.map((bucket) => (
          <WeekdayBar key={bucket.key} bucket={bucket} max={max} />
        ))}
      </div>
    </section>
  );
}

function WeekdayBar({ bucket, max }: { bucket: ActivityBucket; max: number }) {
  const noun = bucket.eventCount === 1 ? "viewing" : "viewings";
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div aria-hidden="true" className="flex h-14 w-full items-end">
        <div
          className="w-full rounded-sm bg-foreground/70"
          style={{ height: `${Math.max(2, (bucket.eventCount / max) * 100)}%` }}
        />
      </div>
      <span aria-hidden="true" className="text-[0.65rem] text-muted-foreground">
        {bucket.label}
      </span>
      <span className="sr-only">
        {bucket.label}: {bucket.eventCount} {noun}
      </span>
    </div>
  );
}
