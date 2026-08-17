import { describe, expect, it } from "vitest";
import { deriveStatsComparison } from "./compare";
import type { StatsProfile } from "./types";

function profile(overrides: Partial<StatsProfile> = {}): StatsProfile {
  return {
    range: { kind: "year", year: 2026 },
    hasAnyHistory: true,
    overview: {
      uniqueMoviesWatched: 10,
      movieWatchEventCount: 10,
      uniqueEpisodesWatched: 50,
      episodeWatchEventCount: 50,
      uniqueShowsWatched: 5,
    },
    headline: { kind: "sparse" },
    viewingRhythm: null,
    weekdayRhythm: null,
    estimatedViewingTime: null,
    genres: { mostWatched: [] },
    directors: [],
    actors: [],
    rewatch: { mostRewatchedMovie: null, mostRevisitedShow: null, rewatchRatePercent: null },
    movieVsShow: null,
    completion: null,
    ...overrides,
  };
}

describe("deriveStatsComparison", () => {
  it("returns null when nothing meaningfully changed", () => {
    const current = profile();
    const previous = profile();
    expect(deriveStatsComparison(current, previous, "2025")).toBeNull();
  });

  it("reports a Movies delta with the real before/after counts", () => {
    const current = profile({
      overview: { ...profile().overview, uniqueMoviesWatched: 31 },
    });
    const previous = profile({
      overview: { ...profile().overview, uniqueMoviesWatched: 24 },
    });
    const result = deriveStatsComparison(current, previous, "2025");
    expect(result?.facts).toContainEqual({
      kind: "movies",
      text: "You watched more Movies than 2025 (24 → 31).",
    });
  });

  it("reports a fewer-than fact when the count dropped", () => {
    const current = profile({
      overview: { ...profile().overview, episodeWatchEventCount: 280 },
    });
    const previous = profile({
      overview: { ...profile().overview, episodeWatchEventCount: 312 },
    });
    const result = deriveStatsComparison(current, previous, "2025");
    expect(result?.facts).toContainEqual({
      kind: "episodes",
      text: "You watched fewer Episodes than 2025 (312 → 280).",
    });
  });

  it("notes a genre shift only when the top genre actually changed", () => {
    const current = profile({
      genres: { mostWatched: [{ genreId: 1, genreName: "Drama", titleCount: 5 }] },
    });
    const previous = profile({
      genres: { mostWatched: [{ genreId: 2, genreName: "Comedy", titleCount: 5 }] },
    });
    const result = deriveStatsComparison(current, previous, "2025");
    expect(result?.facts).toContainEqual({
      kind: "genreShift",
      text: "Drama became more prominent than Comedy was.",
    });
  });

  it("stays silent about genre when the top genre is unchanged", () => {
    const same = { mostWatched: [{ genreId: 1, genreName: "Drama", titleCount: 5 }] };
    const current = profile({ genres: same });
    const previous = profile({ genres: same });
    expect(deriveStatsComparison(current, previous, "2025")).toBeNull();
  });

  it("only reports a Movie-vs-Show balance shift once it clears the threshold", () => {
    const current = profile({
      movieVsShow: { moviePercent: 70, showPercent: 30, totalTitles: 10 },
    });
    const smallShift = profile({
      movieVsShow: { moviePercent: 65, showPercent: 35, totalTitles: 10 },
    });
    expect(deriveStatsComparison(current, smallShift, "2025")).toBeNull();

    const bigShift = profile({
      movieVsShow: { moviePercent: 40, showPercent: 60, totalTitles: 10 },
    });
    const result = deriveStatsComparison(current, bigShift, "2025");
    expect(result?.facts).toContainEqual({
      kind: "movieVsShowShift",
      text: "You leaned more toward Movies than 2025.",
    });
  });

  it("never uses red/green judgment language", () => {
    const current = profile({ overview: { ...profile().overview, uniqueMoviesWatched: 1 } });
    const previous = profile({ overview: { ...profile().overview, uniqueMoviesWatched: 20 } });
    const result = deriveStatsComparison(current, previous, "2025");
    const combined = result?.facts.map((fact) => fact.text).join(" ") ?? "";
    expect(combined).not.toMatch(/bad|good|too much|productive/i);
  });
});
