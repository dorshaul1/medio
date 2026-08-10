import { describe, expect, it } from "vitest";
import { normalizeCalendarFilter, normalizeCalendarView } from "./calendar-params";

describe("normalizeCalendarView", () => {
  it.each([
    ["calendar", "calendar"],
    ["upcoming", "upcoming"],
    [undefined, "upcoming"],
    ["bogus", "upcoming"],
  ] as const)("normalizes %s to %s", (input, expected) => {
    expect(normalizeCalendarView(input)).toBe(expected);
  });

  it("uses the first value when given an array (repeated query param)", () => {
    expect(normalizeCalendarView(["calendar", "upcoming"])).toBe("calendar");
  });

  it("falls back to the given Default Calendar view preference when the param is absent", () => {
    expect(normalizeCalendarView(undefined, "calendar")).toBe("calendar");
  });

  it("an explicit param always wins over the preference fallback", () => {
    expect(normalizeCalendarView("upcoming", "calendar")).toBe("upcoming");
  });
});

describe("normalizeCalendarFilter", () => {
  it.each([
    ["tv", "tv"],
    ["movies", "movies"],
    ["all", "all"],
    [undefined, "all"],
    ["bogus", "all"],
  ] as const)("normalizes %s to %s", (input, expected) => {
    expect(normalizeCalendarFilter(input)).toBe(expected);
  });
});
