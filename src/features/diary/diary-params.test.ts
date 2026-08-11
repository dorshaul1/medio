import { describe, expect, it } from "vitest";
import { normalizeDiaryFilter, normalizeDiaryPeriod, normalizeDiarySort } from "./diary-params";

describe("normalizeDiaryFilter", () => {
  it.each([
    ["movies", "movies"],
    ["tv", "tv"],
    ["all", "all"],
    [undefined, "all"],
    ["episodes", "all"],
    ["bogus", "all"],
  ] as const)("normalizes %s to %s", (input, expected) => {
    expect(normalizeDiaryFilter(input)).toBe(expected);
  });

  it("uses the first value when given an array (repeated query param)", () => {
    expect(normalizeDiaryFilter(["movies", "tv"])).toBe("movies");
  });
});

describe("normalizeDiarySort", () => {
  it.each([
    ["oldest", "oldest"],
    ["newest", "newest"],
    [undefined, "newest"],
    ["bogus", "newest"],
  ] as const)("normalizes %s to %s", (input, expected) => {
    expect(normalizeDiarySort(input)).toBe(expected);
  });
});

describe("normalizeDiaryPeriod", () => {
  const now = new Date(Date.UTC(2026, 7, 9)); // August 9, 2026 UTC

  it("parses a valid ?month= value", () => {
    expect(normalizeDiaryPeriod("2020-03", now)).toEqual({ year: 2020, month: 3 });
  });

  it("falls back to now's UTC calendar month when missing", () => {
    expect(normalizeDiaryPeriod(undefined, now)).toEqual({ year: 2026, month: 8 });
  });

  it("falls back to now's UTC calendar month when malformed", () => {
    expect(normalizeDiaryPeriod("not-a-month", now)).toEqual({ year: 2026, month: 8 });
    expect(normalizeDiaryPeriod("2026-13", now)).toEqual({ year: 2026, month: 8 });
  });

  it("uses the first value when given an array (repeated query param)", () => {
    expect(normalizeDiaryPeriod(["2020-03", "2021-04"], now)).toEqual({ year: 2020, month: 3 });
  });
});
