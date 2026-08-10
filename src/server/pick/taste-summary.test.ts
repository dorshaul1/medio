import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const listMediaRatings = vi.fn();
vi.mock("@/server/opinions/ratings", () => ({ listMediaRatings: () => listMediaRatings() }));

const getMovieWatchAggregates = vi.fn();
const getShowWatchAggregates = vi.fn();
vi.mock("@/server/stats/candidates", () => ({
  getMovieWatchAggregates: (...args: unknown[]) => getMovieWatchAggregates(...args),
  getShowWatchAggregates: (...args: unknown[]) => getShowWatchAggregates(...args),
}));

const hydrateTasteTitles = vi.fn();
vi.mock("@/server/stats/hydrate", () => ({
  hydrateTasteTitles: (...args: unknown[]) => hydrateTasteTitles(...args),
}));

const { getRecommendationTasteSummary } = await import("./taste-summary");

const ACTION = { id: 28, name: "Action" };
const SCI_FI_SHOW = { id: 10765, name: "Sci-Fi & Fantasy" };

function movieTitle(overrides: Record<string, unknown> = {}) {
  return {
    mediaType: "movie" as const,
    mediaProviderId: 1,
    title: "Movie",
    poster: null,
    year: 2020,
    genres: [ACTION],
    rating: 5,
    lastActivityAt: new Date("2024-01-01"),
    cast: [],
    watchCount: 1,
    directors: [{ id: 900, name: "Christopher Nolan" }],
    runtimeMinutes: 120,
    ...overrides,
  };
}

function showTitle(overrides: Record<string, unknown> = {}) {
  return {
    mediaType: "show" as const,
    mediaProviderId: 2,
    title: "Show",
    poster: null,
    year: 2020,
    genres: [SCI_FI_SHOW],
    rating: 5,
    lastActivityAt: new Date("2024-01-01"),
    cast: [],
    watchedEpisodeCount: 10,
    rewatchedEpisodeCount: 0,
    totalEpisodeEvents: 10,
    creators: [],
    episodeRuntimeMinutes: 45,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getMovieWatchAggregates.mockResolvedValue([]);
  getShowWatchAggregates.mockResolvedValue([]);
  hydrateTasteTitles.mockResolvedValue([]);
});

describe("getRecommendationTasteSummary", () => {
  it("returns an honest empty summary for a user with no ratings at all", async () => {
    listMediaRatings.mockResolvedValue([]);

    const summary = await getRecommendationTasteSummary("user-1");

    expect(summary).toEqual({
      hasEnoughDataForPersonalization: false,
      movieGenreAffinities: [],
      showGenreAffinities: [],
      topDirector: null,
      seedMovies: [],
      seedShows: [],
    });
    expect(getMovieWatchAggregates).not.toHaveBeenCalled();
  });

  it("keeps movie and show genre affinities in separate namespaces", async () => {
    // Genre insight requires at least 3 titles of that media type (see
    // MIN_TOTAL_TITLES_FOR_GENRE_INSIGHT) — three of each here.
    listMediaRatings.mockResolvedValue([
      { mediaType: "movie", mediaProviderId: 1, rating: 5 },
      { mediaType: "movie", mediaProviderId: 3, rating: 4 },
      { mediaType: "movie", mediaProviderId: 5, rating: 5 },
      { mediaType: "show", mediaProviderId: 2, rating: 5 },
      { mediaType: "show", mediaProviderId: 4, rating: 4 },
      { mediaType: "show", mediaProviderId: 6, rating: 5 },
    ]);
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date("2024-01-01") },
      { movieProviderId: 3, watchCount: 1, lastWatchedAt: new Date("2024-01-02") },
      { movieProviderId: 5, watchCount: 1, lastWatchedAt: new Date("2024-01-03") },
    ]);
    getShowWatchAggregates.mockResolvedValue([
      {
        showProviderId: 2,
        watchedEpisodeCount: 5,
        rewatchedEpisodeCount: 0,
        totalEpisodeEvents: 5,
        lastActivityAt: new Date("2024-01-01"),
      },
      {
        showProviderId: 4,
        watchedEpisodeCount: 5,
        rewatchedEpisodeCount: 0,
        totalEpisodeEvents: 5,
        lastActivityAt: new Date("2024-01-02"),
      },
      {
        showProviderId: 6,
        watchedEpisodeCount: 5,
        rewatchedEpisodeCount: 0,
        totalEpisodeEvents: 5,
        lastActivityAt: new Date("2024-01-03"),
      },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      movieTitle({ mediaProviderId: 1, genres: [ACTION], rating: 5 }),
      movieTitle({ mediaProviderId: 3, genres: [ACTION], rating: 4 }),
      movieTitle({ mediaProviderId: 5, genres: [ACTION], rating: 5 }),
      showTitle({ mediaProviderId: 2, genres: [SCI_FI_SHOW], rating: 5 }),
      showTitle({ mediaProviderId: 4, genres: [SCI_FI_SHOW], rating: 4 }),
      showTitle({ mediaProviderId: 6, genres: [SCI_FI_SHOW], rating: 5 }),
    ]);

    const summary = await getRecommendationTasteSummary("user-1");

    expect(summary.movieGenreAffinities.map((g) => g.genreId)).toEqual([ACTION.id]);
    expect(summary.showGenreAffinities.map((g) => g.genreId)).toEqual([SCI_FI_SHOW.id]);
    // Never cross-contaminates — a show's genre id never appears in the
    // movie namespace or vice versa.
    expect(summary.movieGenreAffinities.some((g) => g.genreId === SCI_FI_SHOW.id)).toBe(false);
  });

  it("ranks the favorite director from movie credits only", async () => {
    listMediaRatings.mockResolvedValue([
      { mediaType: "movie", mediaProviderId: 1, rating: 5 },
      { mediaType: "movie", mediaProviderId: 3, rating: 4 },
    ]);
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date("2024-01-01") },
      { movieProviderId: 3, watchCount: 1, lastWatchedAt: new Date("2024-01-02") },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      movieTitle({
        mediaProviderId: 1,
        rating: 5,
        directors: [{ id: 900, name: "Christopher Nolan" }],
      }),
      movieTitle({
        mediaProviderId: 3,
        rating: 4,
        directors: [{ id: 900, name: "Christopher Nolan" }],
      }),
    ]);

    const summary = await getRecommendationTasteSummary("user-1");
    expect(summary.topDirector).toEqual({ id: 900, name: "Christopher Nolan" });
  });

  it("ranks seed titles by rating desc, then recency, capped to the seed limit", async () => {
    listMediaRatings.mockResolvedValue([
      { mediaType: "movie", mediaProviderId: 1, rating: 3 },
      { mediaType: "movie", mediaProviderId: 2, rating: 5 },
      { mediaType: "movie", mediaProviderId: 3, rating: 5 },
      { mediaType: "movie", mediaProviderId: 4, rating: 5 },
    ]);
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date("2024-01-01") },
      { movieProviderId: 2, watchCount: 1, lastWatchedAt: new Date("2024-01-02") },
      { movieProviderId: 3, watchCount: 1, lastWatchedAt: new Date("2024-01-03") },
      { movieProviderId: 4, watchCount: 1, lastWatchedAt: new Date("2024-01-04") },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      movieTitle({
        mediaProviderId: 1,
        title: "Low Rated",
        rating: 3,
        lastActivityAt: new Date("2024-01-01"),
      }),
      movieTitle({
        mediaProviderId: 2,
        title: "Oldest Five",
        rating: 5,
        lastActivityAt: new Date("2024-01-02"),
      }),
      movieTitle({
        mediaProviderId: 3,
        title: "Middle Five",
        rating: 5,
        lastActivityAt: new Date("2024-01-03"),
      }),
      movieTitle({
        mediaProviderId: 4,
        title: "Newest Five",
        rating: 5,
        lastActivityAt: new Date("2024-01-04"),
      }),
    ]);

    const summary = await getRecommendationTasteSummary("user-1");

    // Seed movie limit is 3 — the lowest-rated title never makes it in,
    // and among the tied 5-star titles, most-recent-first wins the tie.
    expect(summary.seedMovies.map((seed) => seed.title)).toEqual([
      "Newest Five",
      "Middle Five",
      "Oldest Five",
    ]);
  });

  it("reports enough data for personalization from seeds alone, even below the genre threshold", async () => {
    listMediaRatings.mockResolvedValue([{ mediaType: "movie", mediaProviderId: 1, rating: 5 }]);
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date() },
    ]);
    hydrateTasteTitles.mockResolvedValue([movieTitle({ mediaProviderId: 1, genres: [] })]);

    const summary = await getRecommendationTasteSummary("user-1");
    expect(summary.hasEnoughDataForPersonalization).toBe(true);
    expect(summary.movieGenreAffinities).toEqual([]);
  });
});
