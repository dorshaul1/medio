import { describe, expect, it } from "vitest";
import { parseDateInputValue, toDateInputValue } from "./date-input";

describe("toDateInputValue", () => {
  it("formats a local date as YYYY-MM-DD, zero-padded", () => {
    expect(toDateInputValue(new Date(2024, 0, 5))).toBe("2024-01-05");
  });
});

describe("parseDateInputValue", () => {
  it("parses a well-formed date", () => {
    const parsed = parseDateInputValue("2024-01-05");
    expect(parsed?.getFullYear()).toBe(2024);
    expect(parsed?.getMonth()).toBe(0);
    expect(parsed?.getDate()).toBe(5);
  });

  it("rejects a calendar-invalid date instead of silently rolling it over", () => {
    expect(parseDateInputValue("2024-02-30")).toBeNull();
  });

  it("rejects malformed text", () => {
    expect(parseDateInputValue("not a date")).toBeNull();
    expect(parseDateInputValue("2024/01/05")).toBeNull();
    expect(parseDateInputValue("")).toBeNull();
  });

  it("round-trips through toDateInputValue", () => {
    const date = new Date(2022, 11, 25);
    expect(parseDateInputValue(toDateInputValue(date))?.getTime()).toBe(date.getTime());
  });
});
