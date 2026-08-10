// Pure rating-based summary logic — no I/O. Every rating here is a
// title's *current* rating, counted exactly once regardless of rewatch
// count (rewatches are a separate behavioral signal — see
// docs/stats.md, "Ratings for shows"/"Average rating with rewatches").
import { MIN_RATINGS_FOR_DISTRIBUTION, MIN_RATINGS_FOR_TYPE_AVERAGE } from "./constants";
import type { RatingComparison, RatingDistribution } from "./types";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

export function computeRatingDistribution(ratings: readonly number[]): RatingDistribution {
  if (ratings.length < MIN_RATINGS_FOR_DISTRIBUTION) return null;

  const buckets = RATING_VALUES.map((rating) => ({
    rating,
    count: ratings.filter((value) => value === rating).length,
  }));

  return { buckets, totalRatings: ratings.length };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Only computed when *both* sides have a meaningful sample — one side is
// never rendered as zero for lack of data (see docs/stats.md, "Movie vs
// Show rating comparison").
export function computeMovieShowRatingComparison(
  movieRatings: readonly number[],
  showRatings: readonly number[],
): RatingComparison {
  if (
    movieRatings.length < MIN_RATINGS_FOR_TYPE_AVERAGE ||
    showRatings.length < MIN_RATINGS_FOR_TYPE_AVERAGE
  ) {
    return null;
  }

  return { movieAverage: average(movieRatings), showAverage: average(showRatings) };
}
