import { describe, expect, it } from "vitest";
import { addMonths, formatMonthParam, parseMonthParam } from "./month";

describe("parseMonthParam", () => {
  it("parses a valid YYYY-MM value", () => {
    expect(parseMonthParam("2025-08")).toEqual({ year: 2025, month: 8 });
  });

  it("rejects a malformed value", () => {
    expect(parseMonthParam("2025-8")).toBeNull();
    expect(parseMonthParam("not-a-month")).toBeNull();
    expect(parseMonthParam("2025-13")).toBeNull();
    expect(parseMonthParam("2025-00")).toBeNull();
  });
});

describe("formatMonthParam", () => {
  it("pads single-digit months", () => {
    expect(formatMonthParam({ year: 2025, month: 3 })).toBe("2025-03");
  });
});

describe("addMonths", () => {
  it("adds within the same year", () => {
    expect(addMonths({ year: 2025, month: 3 }, 2)).toEqual({ year: 2025, month: 5 });
  });

  it("rolls over into the next year", () => {
    expect(addMonths({ year: 2025, month: 11 }, 3)).toEqual({ year: 2026, month: 2 });
  });

  it("rolls back into the previous year", () => {
    expect(addMonths({ year: 2025, month: 1 }, -2)).toEqual({ year: 2024, month: 11 });
  });
});
