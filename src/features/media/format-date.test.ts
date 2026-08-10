import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./format-date";

describe("formatDate", () => {
  it("formats an ISO date string as a short, human-readable date", () => {
    expect(formatDate("2011-04-17")).toBe("Apr 17, 2011");
  });

  it("doesn't shift an ISO date across a UTC day boundary depending on local timezone", () => {
    expect(formatDate("2024-01-01")).toBe("Jan 1, 2024");
  });

  it("formats a future ISO date the same way as a past one — no special-casing", () => {
    expect(formatDate("2099-12-31")).toBe("Dec 31, 2099");
  });

  it("formats a real Date (e.g. a tracking watchedAt timestamp)", () => {
    expect(formatDate(new Date("2024-08-07T12:00:00Z"))).toBe("Aug 7, 2024");
  });
});

describe("formatDateTime", () => {
  it("includes a time alongside the date", () => {
    expect(formatDateTime(new Date(2024, 0, 1, 9, 5))).toBe("Jan 1, 2024, 9:05 AM");
  });

  it("distinguishes two events on the same calendar day", () => {
    const morning = formatDateTime(new Date(2024, 5, 1, 8, 0));
    const evening = formatDateTime(new Date(2024, 5, 1, 20, 0));
    expect(morning).not.toBe(evening);
  });
});
