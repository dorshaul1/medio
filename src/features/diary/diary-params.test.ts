import { describe, expect, it } from "vitest";
import { normalizeDiaryFilter, normalizeDiarySort } from "./diary-params";

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
