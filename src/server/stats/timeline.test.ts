import { describe, expect, it } from "vitest";
import {
  computeDailyActivity,
  computeMonthlyActivity,
  computeYearlyActivity,
  toActivityBuckets,
} from "./timeline";

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

describe("toActivityBuckets", () => {
  it("maps monthly activity into the generic bucket shape", () => {
    const monthly = computeMonthlyActivity(
      [new Date(Date.UTC(2026, 7, 1))],
      2,
      new Date(Date.UTC(2026, 7, 9)),
    );
    expect(toActivityBuckets(monthly)).toEqual([
      { key: "2026-7", label: "Jul", eventCount: 0 },
      { key: "2026-8", label: "Aug", eventCount: 1 },
    ]);
  });
});

describe("computeDailyActivity", () => {
  it("returns every day of the month, including zero-activity days", () => {
    const buckets = computeDailyActivity([], { year: 2026, month: 2 });
    expect(buckets).toHaveLength(28); // February 2026 is not a leap year
    expect(buckets.every((bucket) => bucket.eventCount === 0)).toBe(true);
    expect(buckets[0]).toEqual({ key: "2026-2-1", label: "1", eventCount: 0 });
  });

  it("counts each event on its own UTC day", () => {
    const timestamps = [
      new Date(Date.UTC(2026, 7, 10, 20, 0)),
      new Date(Date.UTC(2026, 7, 10, 23, 0)),
      new Date(Date.UTC(2026, 7, 15, 1, 0)),
    ];
    const buckets = computeDailyActivity(timestamps, { year: 2026, month: 8 });
    expect(buckets.find((b) => b.key === "2026-8-10")?.eventCount).toBe(2);
    expect(buckets.find((b) => b.key === "2026-8-15")?.eventCount).toBe(1);
  });

  it("ignores a timestamp outside the requested month", () => {
    const buckets = computeDailyActivity([new Date(Date.UTC(2026, 6, 31))], {
      year: 2026,
      month: 8,
    });
    expect(buckets.every((bucket) => bucket.eventCount === 0)).toBe(true);
  });
});

describe("computeYearlyActivity", () => {
  it("shapes yearly counts into buckets, oldest first", () => {
    const buckets = computeYearlyActivity([
      { year: 2026, eventCount: 10 },
      { year: 2024, eventCount: 3 },
    ]);
    expect(buckets).toEqual([
      { key: "2024", label: "2024", eventCount: 3 },
      { key: "2026", label: "2026", eventCount: 10 },
    ]);
  });
});
