import { describe, expect, it } from "vitest";
import { formatDiaryMonthSummary } from "./diary-month-summary";

describe("formatDiaryMonthSummary", () => {
  it("formats both counts together", () => {
    expect(formatDiaryMonthSummary({ movieCount: 8, episodeCount: 24 })).toBe(
      "8 movies · 24 episodes",
    );
  });

  it("singularizes a count of exactly one", () => {
    expect(formatDiaryMonthSummary({ movieCount: 1, episodeCount: 1 })).toBe("1 movie · 1 episode");
  });

  it("omits a zero side rather than showing '0 movies'", () => {
    expect(formatDiaryMonthSummary({ movieCount: 0, episodeCount: 12 })).toBe("12 episodes");
    expect(formatDiaryMonthSummary({ movieCount: 5, episodeCount: 0 })).toBe("5 movies");
  });

  it("returns null for a sparse month", () => {
    expect(formatDiaryMonthSummary({ movieCount: 0, episodeCount: 0 })).toBeNull();
  });
});
