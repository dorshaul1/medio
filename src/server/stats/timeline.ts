// Pure viewing-timeline aggregation — no I/O. See docs/stats.md, "Viewing
// timeline": a rolling 12-month behavioral-rhythm chart, not a Year in
// Review — always relative to `now`, never a fixed calendar year.
//
// Buckets by UTC calendar month rather than the viewer's real local
// timezone. Diary's per-entry date grouping needs real local time because
// it labels individual days ("Today", "Yesterday") a user will compare
// against their own clock; a monthly bucket is coarse enough that a
// timezone-driven shift only ever matters for events within a few hours
// of a month boundary, and computing it server-side (this is a Server
// Component, unlike Diary's Client Component grouping) keeps the
// aggregation entirely in one pure, testable function rather than
// needing a pre/post-mount reconciliation pass. Documented simplification
// — see docs/stats.md.
import type { ActivityBucket, MonthlyActivity } from "./types";

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });

export function computeMonthlyActivity(
  timestamps: readonly Date[],
  months: number,
  now: Date,
): readonly MonthlyActivity[] {
  // Oldest-first bucket list, ending at `now`'s own UTC month.
  const buckets: MonthlyActivity[] = [];
  const anchorYear = now.getUTCFullYear();
  const anchorMonth = now.getUTCMonth(); // 0-11

  for (let offset = months - 1; offset >= 0; offset--) {
    const bucketDate = new Date(Date.UTC(anchorYear, anchorMonth - offset, 1));
    buckets.push({
      year: bucketDate.getUTCFullYear(),
      month: bucketDate.getUTCMonth() + 1,
      monthLabel: MONTH_LABEL_FORMAT.format(bucketDate),
      eventCount: 0,
    });
  }

  const indexByKey = new Map(
    buckets.map((bucket, index) => [`${bucket.year}-${bucket.month}`, index]),
  );

  for (const timestamp of timestamps) {
    const key = `${timestamp.getUTCFullYear()}-${timestamp.getUTCMonth() + 1}`;
    const index = indexByKey.get(key);
    if (index !== undefined) {
      const bucket = buckets[index];
      if (bucket) bucket.eventCount += 1;
    }
  }

  return buckets;
}

export function toActivityBuckets(monthly: readonly MonthlyActivity[]): readonly ActivityBucket[] {
  return monthly.map((bucket) => ({
    key: `${bucket.year}-${bucket.month}`,
    label: bucket.monthLabel,
    eventCount: bucket.eventCount,
  }));
}

// One `?range=YYYY-MM` month's viewing rhythm, bucketed by UTC calendar
// day — see docs/stats.md, "Viewing rhythm and range": a single selected
// month is exactly the one case a 12-entry monthly chart can't represent
// meaningfully, so it drops one granularity level instead. Always every
// day of the month (including zero-activity days — a real gap is real
// information, same principle `computeMonthlyActivity` already applies).
export function computeDailyActivity(
  timestamps: readonly Date[],
  period: { year: number; month: number },
): readonly ActivityBucket[] {
  const daysInMonth = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();

  const buckets: ActivityBucket[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const bucketDate = new Date(Date.UTC(period.year, period.month - 1, day));
    buckets.push({
      key: `${period.year}-${period.month}-${day}`,
      label: DAY_LABEL_FORMAT.format(bucketDate),
      eventCount: 0,
    });
  }

  for (const timestamp of timestamps) {
    const day = timestamp.getUTCDate();
    const bucket = buckets[day - 1];
    if (
      bucket &&
      timestamp.getUTCFullYear() === period.year &&
      timestamp.getUTCMonth() + 1 === period.month
    ) {
      bucket.eventCount += 1;
    }
  }

  return buckets;
}

// All time's viewing rhythm, bucketed by real calendar year — see
// docs/stats.md, "Viewing rhythm and range": never a 10-year, 120-column
// monthly chart. `yearlyCounts` already comes from a bounded SQL
// aggregate (`getYearlyActivityCounts`), one row per real active year —
// this only shapes it into the generic `ActivityBucket` form, oldest
// first.
export function computeYearlyActivity(
  yearlyCounts: readonly { year: number; eventCount: number }[],
): readonly ActivityBucket[] {
  return [...yearlyCounts]
    .sort((a, b) => a.year - b.year)
    .map((entry) => ({
      key: String(entry.year),
      label: String(entry.year),
      eventCount: entry.eventCount,
    }));
}
