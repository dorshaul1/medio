import { describe, expect, it } from "vitest";
import { computeMovieVsShowInsight } from "./movie-vs-show";

describe("computeMovieVsShowInsight", () => {
  it("returns null below the minimum total-title sample", () => {
    expect(computeMovieVsShowInsight(2, 1)).toBeNull();
  });

  it("computes a percentage split of unique titles, not viewing events", () => {
    const insight = computeMovieVsShowInsight(6, 2);
    expect(insight).toEqual({ moviePercent: 75, showPercent: 25, totalTitles: 8 });
  });

  it("still reports a (lopsided) split when a user watches only one media type", () => {
    const insight = computeMovieVsShowInsight(5, 0);
    expect(insight).toEqual({ moviePercent: 100, showPercent: 0, totalTitles: 5 });
  });
});
