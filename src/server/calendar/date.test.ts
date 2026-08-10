import { describe, expect, it } from "vitest";
import {
  compareDateOnly,
  daysBetween,
  formatReleaseDate,
  hasAired,
  parseDateOnly,
  todayParts,
} from "./date";

describe("parseDateOnly", () => {
  it("parses an ISO date-only string into numeric parts", () => {
    expect(parseDateOnly("2026-08-17")).toEqual({ year: 2026, month: 8, day: 17 });
  });
});

describe("todayParts", () => {
  it("uses local getters when useLocalTimezone is true", () => {
    const now = new Date(2026, 7, 17, 23, 30); // Aug 17 local, late evening
    expect(todayParts(now, true)).toEqual({ year: 2026, month: 8, day: 17 });
  });

  it("uses UTC getters when useLocalTimezone is false, regardless of local time", () => {
    // Constructed so its UTC date differs from a naive local read would
    // suggest, to prove this path never touches local getters.
    const now = new Date(Date.UTC(2026, 7, 18, 2, 0));
    expect(todayParts(now, false)).toEqual({ year: 2026, month: 8, day: 18 });
  });
});

describe("daysBetween", () => {
  it("is 0 for the same date", () => {
    expect(daysBetween({ year: 2026, month: 8, day: 17 }, { year: 2026, month: 8, day: 17 })).toBe(
      0,
    );
  });

  it("is positive when `to` is later", () => {
    expect(daysBetween({ year: 2026, month: 8, day: 17 }, { year: 2026, month: 8, day: 20 })).toBe(
      3,
    );
  });

  it("is negative when `to` is earlier", () => {
    expect(daysBetween({ year: 2026, month: 8, day: 17 }, { year: 2026, month: 8, day: 14 })).toBe(
      -3,
    );
  });

  it("correctly crosses a month boundary", () => {
    expect(daysBetween({ year: 2026, month: 8, day: 30 }, { year: 2026, month: 9, day: 2 })).toBe(
      3,
    );
  });

  it("correctly crosses a year boundary — December to January", () => {
    expect(daysBetween({ year: 2026, month: 12, day: 30 }, { year: 2027, month: 1, day: 2 })).toBe(
      3,
    );
  });
});

describe("compareDateOnly", () => {
  it("orders ISO date-only strings correctly", () => {
    const dates = ["2026-08-20", "2026-08-01", "2027-01-01", "2025-12-31"];
    expect([...dates].sort(compareDateOnly)).toEqual([
      "2025-12-31",
      "2026-08-01",
      "2026-08-20",
      "2027-01-01",
    ]);
  });
});

describe("hasAired", () => {
  const NOW = new Date(Date.UTC(2026, 7, 17));

  it("is true for a date on or before now", () => {
    expect(hasAired("2026-08-17", NOW)).toBe(true);
    expect(hasAired("2026-08-01", NOW)).toBe(true);
  });

  it("is false for a future date", () => {
    expect(hasAired("2026-08-18", NOW)).toBe(false);
  });

  it("conservatively treats a missing date as not aired", () => {
    expect(hasAired(null, NOW)).toBe(false);
  });
});

describe("formatReleaseDate", () => {
  const NOW = new Date(Date.UTC(2026, 7, 17)); // Aug 17, 2026 UTC

  it("labels today's date as 'Today' once local timezone is known", () => {
    expect(formatReleaseDate("2026-08-17", NOW, true)).toBe("Today");
  });

  it("labels tomorrow's date as 'Tomorrow'", () => {
    expect(formatReleaseDate("2026-08-18", NOW, true)).toBe("Tomorrow");
  });

  it("labels yesterday's date as 'Yesterday'", () => {
    expect(formatReleaseDate("2026-08-16", NOW, true)).toBe("Yesterday");
  });

  it("never labels a date as Today/Tomorrow before the local timezone is known", () => {
    const label = formatReleaseDate("2026-08-17", NOW, false);
    expect(label).not.toBe("Today");
    expect(label).toBe("Aug 17");
  });

  it("shows a plain month/day for a date further out", () => {
    expect(formatReleaseDate("2026-09-01", NOW, true)).toBe("Sep 1");
  });

  it("includes the year only when it differs from the current year", () => {
    expect(formatReleaseDate("2027-01-05", NOW, true)).toBe("Jan 5, 2027");
    expect(formatReleaseDate("2026-12-25", NOW, true)).toBe("Dec 25");
  });

  it("never invents a time of day", () => {
    expect(formatReleaseDate("2026-09-01", NOW, true)).not.toMatch(/\d{1,2}:\d{2}/);
  });
});
