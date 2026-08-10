import { describe, expect, it } from "vitest";
import {
  computeRewatchRatePercent,
  findMostRevisitedShow,
  findMostRewatchedMovie,
} from "./rewatch";

describe("findMostRewatchedMovie", () => {
  it("returns null when no movie has been watched more than once", () => {
    expect(
      findMostRewatchedMovie([{ movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date() }]),
    ).toBeNull();
  });

  it("picks the movie with the highest watch count", () => {
    const result = findMostRewatchedMovie([
      { movieProviderId: 1, watchCount: 2, lastWatchedAt: new Date("2024-01-01") },
      { movieProviderId: 2, watchCount: 4, lastWatchedAt: new Date("2024-01-01") },
    ]);
    expect(result?.movieProviderId).toBe(2);
  });

  it("breaks a tie deterministically by most recent watch, then id", () => {
    const result = findMostRewatchedMovie([
      { movieProviderId: 2, watchCount: 3, lastWatchedAt: new Date("2024-01-01") },
      { movieProviderId: 1, watchCount: 3, lastWatchedAt: new Date("2024-06-01") },
    ]);
    expect(result?.movieProviderId).toBe(1);
  });
});

describe("findMostRevisitedShow", () => {
  it("requires at least two rewatched episode instances", () => {
    expect(findMostRevisitedShow([{ showProviderId: 1, rewatchedEpisodeCount: 1 }])).toBeNull();
  });

  it("picks the show with the most rewatched episode instances", () => {
    const result = findMostRevisitedShow([
      { showProviderId: 1, rewatchedEpisodeCount: 2 },
      { showProviderId: 2, rewatchedEpisodeCount: 5 },
    ]);
    expect(result?.showProviderId).toBe(2);
  });
});

describe("computeRewatchRatePercent", () => {
  it("returns null below the minimum unique-title sample", () => {
    expect(
      computeRewatchRatePercent({
        moviesWithRewatch: 1,
        showsWithRewatch: 0,
        uniqueMoviesWatched: 2,
        uniqueShowsWatched: 0,
      }),
    ).toBeNull();
  });

  it("computes the percentage of unique titles with at least one rewatch", () => {
    const percent = computeRewatchRatePercent({
      moviesWithRewatch: 1,
      showsWithRewatch: 1,
      uniqueMoviesWatched: 8,
      uniqueShowsWatched: 2,
    });
    expect(percent).toBe(20); // 2 of 10 unique titles
  });
});
