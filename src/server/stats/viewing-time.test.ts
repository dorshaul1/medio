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
    expect(estimateViewingTime([], 0, 0)).toBeNull();
  });

  it("multiplies movie runtime by every viewing event, rewatches included", () => {
    const titles: readonly TasteTitle[] = [movie({ runtimeMinutes: 120, watchCount: 3 })];
    const estimate = estimateViewingTime(titles, 3, 0);
    expect(estimate?.minutes).toBe(360);
    expect(estimate?.movieMinutes).toBe(360);
    expect(estimate?.showMinutes).toBeNull();
  });

  it("multiplies a show's typical episode runtime by its total episode events", () => {
    const titles: readonly TasteTitle[] = [
      show({ episodeRuntimeMinutes: 45, totalEpisodeEvents: 10 }),
    ];
    const estimate = estimateViewingTime(titles, 0, 10);
    expect(estimate?.minutes).toBe(450);
    expect(estimate?.showMinutes).toBe(450);
    expect(estimate?.movieMinutes).toBeNull();
  });

  it("withholds the combined estimate entirely below the minimum runtime coverage", () => {
    // 1 of 10 lifetime events has a known runtime — 10% coverage.
    const titles: readonly TasteTitle[] = [movie({ runtimeMinutes: 100, watchCount: 1 })];
    expect(estimateViewingTime(titles, 10, 0)).toBeNull();
  });

  it("never assumes zero runtime for missing data — it's excluded from coverage, not counted as 0", () => {
    const titles: readonly TasteTitle[] = [
      movie({ runtimeMinutes: null, watchCount: 5 }),
      movie({ mediaProviderId: 2, runtimeMinutes: 100, watchCount: 5 }),
    ];
    // 5 of 10 events covered — exactly at a 50% ratio, below the 60%
    // threshold, so still withheld.
    expect(estimateViewingTime(titles, 10, 0)).toBeNull();
  });

  it("gates Movies and Shows breakdowns independently of the combined figure", () => {
    // Movies: 10/10 events covered (100%). Shows: 1/9 events covered
    // (~11%). Combined: 11/19 (~58%)... bump one more movie event so the
    // combined ratio clears 60% too, keeping the combined total present
    // while the Shows breakdown alone stays withheld.
    const titles: readonly TasteTitle[] = [
      movie({ runtimeMinutes: 100, watchCount: 12 }),
      show({ episodeRuntimeMinutes: 30, totalEpisodeEvents: 1 }),
    ];
    const estimate = estimateViewingTime(titles, 12, 9);
    expect(estimate).not.toBeNull();
    expect(estimate?.movieMinutes).toBe(1200);
    expect(estimate?.showMinutes).toBeNull();
    expect(estimate?.minutes).toBe(1230);
  });

  it("shows both breakdowns once each independently clears the coverage bar", () => {
    const titles: readonly TasteTitle[] = [
      movie({ runtimeMinutes: 100, watchCount: 6 }),
      show({ episodeRuntimeMinutes: 30, totalEpisodeEvents: 6 }),
    ];
    const estimate = estimateViewingTime(titles, 6, 6);
    expect(estimate?.movieMinutes).toBe(600);
    expect(estimate?.showMinutes).toBe(180);
    expect(estimate?.minutes).toBe(780);
  });
});
