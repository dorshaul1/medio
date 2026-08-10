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
import type { MonthlyActivity } from "./types";

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

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
