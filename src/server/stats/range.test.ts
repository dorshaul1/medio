import { describe, expect, it } from "vitest";
import {
  formatStatsRangeLabel,
  formatStatsRangeParam,
  parseStatsRangeParam,
  resolvePreviousStatsRangeBounds,
  resolveStatsRangeBounds,
  statsRangeSupportsComparison,
} from "./range";

const NOW = new Date(Date.UTC(2026, 7, 9)); // August 9, 2026 UTC

describe("resolveStatsRangeBounds", () => {
  it("is unbounded for 'all'", () => {
    expect(resolveStatsRangeBounds({ kind: "all" }, NOW)).toBeNull();
  });

  it("bounds a calendar year", () => {
    expect(resolveStatsRangeBounds({ kind: "year", year: 2025 }, NOW)).toEqual({
      start: new Date(Date.UTC(2025, 0, 1)),
      end: new Date(Date.UTC(2026, 0, 1)),
    });
  });

  it("bounds a calendar month", () => {
    expect(resolveStatsRangeBounds({ kind: "month", year: 2026, month: 3 }, NOW)).toEqual({
      start: new Date(Date.UTC(2026, 2, 1)),
      end: new Date(Date.UTC(2026, 3, 1)),
    });
  });

  it("bounds a trailing 12-month window ending at the real current instant", () => {
    const bounds = resolveStatsRangeBounds({ kind: "last12months" }, NOW);
    expect(bounds).toEqual({ start: new Date(Date.UTC(2025, 8, 1)), end: NOW });
  });
});

describe("resolvePreviousStatsRangeBounds", () => {
  it("has no previous period for 'all'", () => {
    expect(resolvePreviousStatsRangeBounds({ kind: "all" }, NOW)).toBeNull();
  });

  it("is the prior calendar year", () => {
    expect(resolvePreviousStatsRangeBounds({ kind: "year", year: 2026 }, NOW)).toEqual({
      start: new Date(Date.UTC(2025, 0, 1)),
      end: new Date(Date.UTC(2026, 0, 1)),
    });
  });

  it("correctly steps back over a leap year without drifting a day", () => {
    // 2024 is a leap year (366 days) — a naive ms-duration shift of
    // 2025's bounds would land one day into 2023 instead of exactly
    // Jan 1 2024.
    expect(resolvePreviousStatsRangeBounds({ kind: "year", year: 2025 }, NOW)).toEqual({
      start: new Date(Date.UTC(2024, 0, 1)),
      end: new Date(Date.UTC(2025, 0, 1)),
    });
  });

  it("is the prior calendar month, rolling back over a year boundary", () => {
    expect(resolvePreviousStatsRangeBounds({ kind: "month", year: 2026, month: 1 }, NOW)).toEqual({
      start: new Date(Date.UTC(2025, 11, 1)),
      end: new Date(Date.UTC(2026, 0, 1)),
    });
  });

  it("is the 12 months immediately before the current trailing window", () => {
    const bounds = resolvePreviousStatsRangeBounds({ kind: "last12months" }, NOW);
    expect(bounds).toEqual({
      start: new Date(Date.UTC(2024, 8, 1)),
      end: new Date(Date.UTC(2025, 8, 1)),
    });
  });
});

describe("statsRangeSupportsComparison", () => {
  it("is false only for 'all'", () => {
    expect(statsRangeSupportsComparison({ kind: "all" })).toBe(false);
    expect(statsRangeSupportsComparison({ kind: "year", year: 2026 })).toBe(true);
    expect(statsRangeSupportsComparison({ kind: "last12months" })).toBe(true);
    expect(statsRangeSupportsComparison({ kind: "month", year: 2026, month: 8 })).toBe(true);
  });
});

describe("parseStatsRangeParam / formatStatsRangeParam", () => {
  it.each([
    [undefined, { kind: "all" }],
    ["all", { kind: "all" }],
    ["last12months", { kind: "last12months" }],
    ["2025", { kind: "year", year: 2025 }],
    ["2026-08", { kind: "month", year: 2026, month: 8 }],
    ["bogus", { kind: "all" }],
    ["2026-13", { kind: "all" }],
  ] as const)("parses %s", (input, expected) => {
    expect(parseStatsRangeParam(input)).toEqual(expected);
  });

  it("uses the first value when given an array (repeated query param)", () => {
    expect(parseStatsRangeParam(["2025", "2026"])).toEqual({ kind: "year", year: 2025 });
  });

  it("round-trips every kind through format/parse", () => {
    const ranges = [
      { kind: "all" as const },
      { kind: "last12months" as const },
      { kind: "year" as const, year: 2025 },
      { kind: "month" as const, year: 2026, month: 8 },
    ];
    for (const range of ranges) {
      expect(parseStatsRangeParam(formatStatsRangeParam(range))).toEqual(range);
    }
  });
});

describe("formatStatsRangeLabel", () => {
  it.each([
    [{ kind: "all" as const }, "All time"],
    [{ kind: "last12months" as const }, "Last 12 months"],
    [{ kind: "year" as const, year: 2025 }, "2025"],
    [{ kind: "month" as const, year: 2026, month: 8 }, "August 2026"],
  ])("labels %o as %s", (range, expected) => {
    expect(formatStatsRangeLabel(range)).toBe(expected);
  });
});
