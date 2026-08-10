import { describe, expect, it } from "vitest";
import { computeMovieShowRatingComparison, computeRatingDistribution } from "./rating-summary";

describe("computeRatingDistribution", () => {
  it("returns null below the minimum rating sample", () => {
    expect(computeRatingDistribution([5, 5, 5])).toBeNull();
  });

  it("buckets ratings 1 through 5, including empty buckets", () => {
    const distribution = computeRatingDistribution([5, 5, 4, 3, 1]);
    expect(distribution?.totalRatings).toBe(5);
    expect(distribution?.buckets).toEqual([
      { rating: 1, count: 1 },
      { rating: 2, count: 0 },
      { rating: 3, count: 1 },
      { rating: 4, count: 1 },
      { rating: 5, count: 2 },
    ]);
  });
});

describe("computeMovieShowRatingComparison", () => {
  it("returns null when either side lacks a meaningful sample", () => {
    expect(computeMovieShowRatingComparison([5], [5, 4])).toBeNull();
  });

  it("never reports zero for a missing side — it omits the whole comparison instead", () => {
    expect(computeMovieShowRatingComparison([5, 4, 3], [])).toBeNull();
  });

  it("computes both averages once each side has enough ratings", () => {
    const comparison = computeMovieShowRatingComparison([5, 3], [4, 4]);
    expect(comparison).toEqual({ movieAverage: 4, showAverage: 4 });
  });
});
