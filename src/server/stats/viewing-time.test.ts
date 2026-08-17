import { describe, expect, it } from "vitest";
import type { TasteMovieTitle, TasteShowTitle, TasteTitle } from "./types";
import { estimateViewingTime } from "./viewing-time";

function movie(overrides: Partial<TasteMovieTitle> = {}): TasteMovieTitle {
  return {
    mediaType: "movie",
    mediaProviderId: 1,
    title: "Movie",
    poster: null,
    year: 2020,
    genres: [],
    lastActivityAt: new Date(),
    cast: [],
    watchCount: 1,
    directors: [],
    runtimeMinutes: null,
    ...overrides,
  };
}

function show(overrides: Partial<TasteShowTitle> = {}): TasteShowTitle {
  return {
    mediaType: "show",
    mediaProviderId: 2,
    title: "Show",
    poster: null,
    year: 2020,
    genres: [],
    lastActivityAt: new Date(),
    cast: [],
    watchedEpisodeCount: 1,
    rewatchedEpisodeCount: 0,
    totalEpisodeEvents: 1,
    creators: [],
    episodeRuntimeMinutes: null,
    ...overrides,
  };
}

describe("estimateViewingTime", () => {
  it("returns null when there is no history at all", () => {
    expect(estimateViewingTime([], 0)).toBeNull();
  });

  it("multiplies movie runtime by every viewing event, rewatches included", () => {
    const titles: readonly TasteTitle[] = [movie({ runtimeMinutes: 120, watchCount: 3 })];
    const estimate = estimateViewingTime(titles, 3);
    expect(estimate?.minutes).toBe(360);
  });

  it("multiplies a show's typical episode runtime by its total episode events", () => {
    const titles: readonly TasteTitle[] = [
      show({ episodeRuntimeMinutes: 45, totalEpisodeEvents: 10 }),
    ];
    const estimate = estimateViewingTime(titles, 10);
    expect(estimate?.minutes).toBe(450);
  });

  it("withholds the estimate entirely below the minimum runtime coverage", () => {
    // 1 of 10 lifetime events has a known runtime — 10% coverage.
    const titles: readonly TasteTitle[] = [movie({ runtimeMinutes: 100, watchCount: 1 })];
    expect(estimateViewingTime(titles, 10)).toBeNull();
  });

  it("never assumes zero runtime for missing data — it's excluded from coverage, not counted as 0", () => {
    const titles: readonly TasteTitle[] = [
      movie({ runtimeMinutes: null, watchCount: 5 }),
      movie({ mediaProviderId: 2, runtimeMinutes: 100, watchCount: 5 }),
    ];
    // 5 of 10 events covered — exactly at a 50% ratio, below the 60%
    // threshold, so still withheld.
    expect(estimateViewingTime(titles, 10)).toBeNull();
  });
});
