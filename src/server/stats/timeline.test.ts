import { describe, expect, it } from "vitest";
import { computeMonthlyActivity } from "./timeline";

describe("computeMonthlyActivity", () => {
  it("always returns exactly `months` buckets, oldest first, even with no events", () => {
    const buckets = computeMonthlyActivity([], 12, new Date(Date.UTC(2026, 7, 9)));
    expect(buckets).toHaveLength(12);
    expect(buckets[0]).toMatchObject({ year: 2025, month: 9, eventCount: 0 });
    expect(buckets[11]).toMatchObject({ year: 2026, month: 8, eventCount: 0 });
    expect(buckets.every((bucket) => bucket.eventCount === 0)).toBe(true);
  });

  it("counts every event in its own UTC month, rewatches included", () => {
    const now = new Date(Date.UTC(2026, 7, 9));
    const timestamps = [
      new Date(Date.UTC(2026, 7, 1)),
      new Date(Date.UTC(2026, 7, 5)),
      new Date(Date.UTC(2026, 6, 15)),
    ];
    const buckets = computeMonthlyActivity(timestamps, 12, now);
    expect(buckets.find((b) => b.year === 2026 && b.month === 8)?.eventCount).toBe(2);
    expect(buckets.find((b) => b.year === 2026 && b.month === 7)?.eventCount).toBe(1);
  });

  it("crosses a year boundary correctly", () => {
    const now = new Date(Date.UTC(2026, 1, 1)); // Feb 2026
    const buckets = computeMonthlyActivity(
      [new Date(Date.UTC(2025, 11, 25))], // Dec 2025
      12,
      now,
    );
    expect(buckets[0]).toMatchObject({ year: 2025, month: 3 });
    expect(buckets.find((b) => b.year === 2025 && b.month === 12)?.eventCount).toBe(1);
  });

  it("ignores an event outside the trailing window", () => {
    const now = new Date(Date.UTC(2026, 7, 9));
    const buckets = computeMonthlyActivity([new Date(Date.UTC(2020, 0, 1))], 12, now);
    expect(buckets.every((bucket) => bucket.eventCount === 0)).toBe(true);
  });
});
