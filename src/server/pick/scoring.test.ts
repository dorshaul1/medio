import { describe, expect, it } from "vitest";
import {
  BACKLOG_BASE_SCORE,
  CONTINUE_BASE_SCORE,
  DIRECTOR_AFFINITY_BONUS,
  DISCOVERY_BASE_SCORE,
  FINISH_SOON_BONUS,
  GENRE_AFFINITY_BONUS,
  RECENT_CONTINUATION_BONUS,
  RECOMMENDATION_SOURCE_BONUS,
  TIME_FIT_BONUS,
  WATCHLIST_BASE_SCORE,
} from "./constants";
import { scoreCandidate } from "./scoring";
import type {
  ContinueEpisodeCandidate,
  DecisionContext,
  DiscoveryMovieCandidate,
  RecommendationTasteSummary,
  SavedMovieCandidate,
} from "./types";

const ANY: DecisionContext = { mediaType: "any", timeBudgetMinutes: null };

const EMPTY_TASTE: RecommendationTasteSummary = {
  hasEnoughDataForPersonalization: false,
  movieGenreAffinities: [],
  showGenreAffinities: [],
  topDirector: null,
  seedMovies: [],
  seedShows: [],
};

function continueCandidate(
  overrides: Partial<ContinueEpisodeCandidate> = {},
): ContinueEpisodeCandidate {
  return {
    kind: "continueEpisode",
    mediaType: "show",
    mediaProviderId: 1,
    title: "A Show",
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 40,
    remainingAiredEpisodeCount: 5,
    isFinishSoon: false,
    // Far enough in the past that no test accidentally earns the
    // recentContinuation bonus unless it explicitly sets a recent date —
    // see the dedicated "recency" describe block below.
    lastActivityAt: new Date("2000-01-01T00:00:00Z"),
    nextEpisode: { seasonNumber: 1, episodeNumber: 2, episodeProviderId: 10 },
    ...overrides,
  };
}

function savedMovie(overrides: Partial<SavedMovieCandidate> = {}): SavedMovieCandidate {
  return {
    kind: "savedMovie",
    mediaType: "movie",
    mediaProviderId: 2,
    title: "A Movie",
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 100,
    intent: "watchlist",
    ...overrides,
  };
}

function discoveryMovie(overrides: Partial<DiscoveryMovieCandidate> = {}): DiscoveryMovieCandidate {
  return {
    kind: "discoveryMovie",
    mediaType: "movie",
    mediaProviderId: 3,
    title: "A Discovery",
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 100,
    source: "popular",
    seedTitle: null,
    ...overrides,
  };
}

describe("scoreCandidate — continue", () => {
  it("scores a plain continuation at the base score with a continueActiveShow reason", () => {
    const result = scoreCandidate(continueCandidate(), ANY, EMPTY_TASTE);
    expect(result.score).toBe(CONTINUE_BASE_SCORE);
    expect(result.reasons).toEqual([{ kind: "continueActiveShow" }]);
  });

  it("Finish Soon adds a bonus and swaps the reason", () => {
    const result = scoreCandidate(continueCandidate({ isFinishSoon: true }), ANY, EMPTY_TASTE);
    expect(result.score).toBe(CONTINUE_BASE_SCORE + FINISH_SOON_BONUS);
    expect(result.reasons[0]).toEqual({ kind: "finishSoon", remainingEpisodes: 5 });
  });

  it("a continuation always outranks a discovery pick, even a heavily-boosted one", () => {
    const continuation = scoreCandidate(continueCandidate(), ANY, EMPTY_TASTE);
    const discovery = scoreCandidate(
      discoveryMovie({ source: "recommendation", seedTitle: "Inception" }),
      ANY,
      EMPTY_TASTE,
    );
    expect(continuation.score).toBeGreaterThan(discovery.score);
  });

  it("adds a time-fit bonus when the episode fits the time budget", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 65 };
    const result = scoreCandidate(continueCandidate({ runtimeMinutes: 40 }), context, EMPTY_TASTE);
    expect(result.score).toBe(CONTINUE_BASE_SCORE + TIME_FIT_BONUS);
    expect(result.reasons.some((reason) => reason.kind === "timeFit")).toBe(true);
  });
});

describe("scoreCandidate — continue recency", () => {
  const now = new Date("2024-06-10T00:00:00Z");

  it("credits a genuinely recent watch with the recentContinuation bonus", () => {
    const result = scoreCandidate(
      continueCandidate({ lastActivityAt: new Date("2024-06-09T00:00:00Z") }),
      ANY,
      EMPTY_TASTE,
      now,
    );
    expect(result.score).toBe(CONTINUE_BASE_SCORE + RECENT_CONTINUATION_BONUS);
    expect(result.reasons).toContainEqual({ kind: "recentContinuation", daysAgo: 1 });
  });

  it("never credits recency once the last activity falls outside the recent window", () => {
    const result = scoreCandidate(
      continueCandidate({ lastActivityAt: new Date("2024-01-01T00:00:00Z") }),
      ANY,
      EMPTY_TASTE,
      now,
    );
    expect(result.score).toBe(CONTINUE_BASE_SCORE);
    expect(result.reasons.some((reason) => reason.kind === "recentContinuation")).toBe(false);
  });
});

describe("scoreCandidate — saved", () => {
  it("Backlog scores higher than Watchlist", () => {
    const backlog = scoreCandidate(savedMovie({ intent: "backlog" }), ANY, EMPTY_TASTE);
    const watchlist = scoreCandidate(savedMovie({ intent: "watchlist" }), ANY, EMPTY_TASTE);
    expect(backlog.score).toBeGreaterThan(watchlist.score);
    expect(backlog.score).toBe(BACKLOG_BASE_SCORE);
    expect(watchlist.score).toBe(WATCHLIST_BASE_SCORE);
  });

  it("a saved item always outranks a discovery pick", () => {
    const saved = scoreCandidate(savedMovie({ intent: "watchlist" }), ANY, EMPTY_TASTE);
    const discovery = scoreCandidate(discoveryMovie(), ANY, EMPTY_TASTE);
    expect(saved.score).toBeGreaterThan(discovery.score);
  });

  it("adds a genre-affinity bonus when a genre matches the taste summary", () => {
    const taste: RecommendationTasteSummary = {
      ...EMPTY_TASTE,
      movieGenreAffinities: [{ genreId: 28, genreName: "Action", titleCount: 5 }],
    };
    const result = scoreCandidate(savedMovie({ genres: [{ id: 28, name: "Action" }] }), ANY, taste);
    expect(result.score).toBe(WATCHLIST_BASE_SCORE + GENRE_AFFINITY_BONUS);
    expect(result.reasons.some((reason) => reason.kind === "highGenreAffinity")).toBe(true);
  });

  it("never applies a show's genre affinities to a movie candidate", () => {
    const taste: RecommendationTasteSummary = {
      ...EMPTY_TASTE,
      showGenreAffinities: [{ genreId: 28, genreName: "Action", titleCount: 5 }],
    };
    const result = scoreCandidate(savedMovie({ genres: [{ id: 28, name: "Action" }] }), ANY, taste);
    expect(result.score).toBe(WATCHLIST_BASE_SCORE);
  });
});

describe("scoreCandidate — discovery", () => {
  it("names the seed title for a recommendation-sourced pick", () => {
    const result = scoreCandidate(
      discoveryMovie({ source: "recommendation", seedTitle: "Fight Club" }),
      ANY,
      EMPTY_TASTE,
    );
    expect(result.score).toBe(DISCOVERY_BASE_SCORE + RECOMMENDATION_SOURCE_BONUS);
    expect(result.reasons).toContainEqual({ kind: "similarToWatched", title: "Fight Club" });
  });

  it("credits the favorite director for a director-sourced pick", () => {
    const taste: RecommendationTasteSummary = {
      ...EMPTY_TASTE,
      topDirector: { id: 1, name: "Christopher Nolan" },
    };
    const result = scoreCandidate(discoveryMovie({ source: "director" }), ANY, taste);
    expect(result.score).toBe(DISCOVERY_BASE_SCORE + DIRECTOR_AFFINITY_BONUS);
    expect(result.reasons).toContainEqual({
      kind: "directorAffinity",
      directorName: "Christopher Nolan",
    });
  });

  it("never claims personalization for a popular fallback pick", () => {
    const result = scoreCandidate(discoveryMovie({ source: "popular" }), ANY, EMPTY_TASTE);
    expect(result.reasons).toEqual([{ kind: "popularDiscovery" }]);
  });

  it("always returns at least one reason, even with no matching signal", () => {
    const result = scoreCandidate(discoveryMovie({ source: "genre" }), ANY, EMPTY_TASTE);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
