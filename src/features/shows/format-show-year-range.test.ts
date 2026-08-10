import { describe, expect, it } from "vitest";
import { formatShowYearRange } from "./format-show-year-range";

describe("formatShowYearRange", () => {
  it("formats an ended show's full range", () => {
    expect(formatShowYearRange(2011, 2019, "Ended")).toBe("2011–2019");
  });

  it("formats a returning show as open-ended, even with a last air year on file", () => {
    expect(formatShowYearRange(2018, 2024, "Returning Series")).toBe("2018–present");
  });

  it("formats an in-production show as open-ended", () => {
    expect(formatShowYearRange(2023, null, "In Production")).toBe("2023–present");
  });

  it("formats a single-year run as just that year, not a repeated range", () => {
    expect(formatShowYearRange(2020, 2020, "Ended")).toBe("2020");
  });

  it("formats an ended show with no last air year as just the first year", () => {
    expect(formatShowYearRange(2020, null, "Ended")).toBe("2020");
  });

  it("returns an empty string when the first air year is unknown", () => {
    expect(formatShowYearRange(null, null, "Ended")).toBe("");
  });
});
