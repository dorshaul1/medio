import { describe, expect, it } from "vitest";
import { parseDateOnly, parseExactTimestamp } from "./date";

describe("parseDateOnly", () => {
  it("anchors a date-only value at 12:00 UTC", () => {
    const result = parseDateOnly("2026-08-10");
    expect(result?.precision).toBe("dateOnly");
    expect(result?.date.toISOString()).toBe("2026-08-10T12:00:00.000Z");
  });

  it("stays on the same calendar date for every offset from UTC-12 through UTC+11", () => {
    // Noon UTC has exactly 12 hours of margin each direction; a spread
    // wider than 24h (real offsets run UTC-12..+14) can't be fully
    // covered by any single anchor — see the rationale comment in
    // `date.ts`. This pins the honestly-guaranteed range.
    const result = parseDateOnly("2026-08-10");
    const instant = result?.date.getTime() ?? 0;
    for (let offsetHours = -12; offsetHours <= 11; offsetHours++) {
      const local = new Date(instant + offsetHours * 60 * 60 * 1000);
      expect(local.getUTCDate()).toBe(10);
    }
  });

  it("documents the known extreme-eastern-offset gap (UTC+12 and beyond can roll to the next day)", () => {
    const result = parseDateOnly("2026-08-10");
    const instant = result?.date.getTime() ?? 0;
    const nzDaylightSaving = new Date(instant + 13 * 60 * 60 * 1000); // UTC+13
    expect(nzDaylightSaving.getUTCDate()).toBe(11);
  });

  it("rejects a malformed date string", () => {
    expect(parseDateOnly("not-a-date")).toBeNull();
    expect(parseDateOnly("2026/08/10")).toBeNull();
  });

  it("rejects a date that doesn't exist (e.g. Feb 30)", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
  });

  it("accepts a valid leap-day date", () => {
    expect(parseDateOnly("2024-02-29")).not.toBeNull();
  });
});

describe("parseExactTimestamp", () => {
  it("parses a real ISO instant", () => {
    const result = parseExactTimestamp("2026-08-10T14:30:00.000Z");
    expect(result?.precision).toBe("exact");
    expect(result?.date.toISOString()).toBe("2026-08-10T14:30:00.000Z");
  });

  it("rejects an invalid timestamp", () => {
    expect(parseExactTimestamp("not-a-timestamp")).toBeNull();
  });
});
