import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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
  it("returns an honest empty summary for a user with too little watch history", async () => {
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date() },
    ]);

    const summary = await getRecommendationTasteSummary("user-1");

    expect(summary).toEqual({
      hasEnoughDataForPersonalization: false,
      movieGenreAffinities: [],
      showGenreAffinities: [],
      topDirector: null,
      seedMovies: [],
      seedShows: [],
    });
    expect(hydrateTasteTitles).not.toHaveBeenCalled();
  });

  it("keeps movie and show genre affinities in separate namespaces", async () => {
    // Genre insight requires at least 3 titles of that media type (see
    // MIN_TOTAL_TITLES_FOR_GENRE_INSIGHT) — three of each here.
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
      movieTitle({ mediaProviderId: 1, genres: [ACTION] }),
      movieTitle({ mediaProviderId: 3, genres: [ACTION] }),
      movieTitle({ mediaProviderId: 5, genres: [ACTION] }),
      showTitle({ mediaProviderId: 2, genres: [SCI_FI_SHOW] }),
      showTitle({ mediaProviderId: 4, genres: [SCI_FI_SHOW] }),
      showTitle({ mediaProviderId: 6, genres: [SCI_FI_SHOW] }),
    ]);

    const summary = await getRecommendationTasteSummary("user-1");

    expect(summary.movieGenreAffinities.map((g) => g.genreId)).toEqual([ACTION.id]);
    expect(summary.showGenreAffinities.map((g) => g.genreId)).toEqual([SCI_FI_SHOW.id]);
    // Never cross-contaminates — a show's genre id never appears in the
    // movie namespace or vice versa.
    expect(summary.movieGenreAffinities.some((g) => g.genreId === SCI_FI_SHOW.id)).toBe(false);
  });

  it("ranks the favorite director from movie credits only", async () => {
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date("2024-01-01") },
      { movieProviderId: 3, watchCount: 1, lastWatchedAt: new Date("2024-01-02") },
      { movieProviderId: 5, watchCount: 1, lastWatchedAt: new Date("2024-01-03") },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      movieTitle({ mediaProviderId: 1, directors: [{ id: 900, name: "Christopher Nolan" }] }),
      movieTitle({ mediaProviderId: 3, directors: [{ id: 900, name: "Christopher Nolan" }] }),
      movieTitle({ mediaProviderId: 5, directors: [] }),
    ]);

    const summary = await getRecommendationTasteSummary("user-1");
    expect(summary.topDirector).toEqual({ id: 900, name: "Christopher Nolan" });
  });

  it("ranks movie seed titles by watch count desc, then recency, capped to the seed limit", async () => {
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date("2024-01-01") },
      { movieProviderId: 2, watchCount: 3, lastWatchedAt: new Date("2024-01-02") },
      { movieProviderId: 3, watchCount: 3, lastWatchedAt: new Date("2024-01-03") },
      { movieProviderId: 4, watchCount: 3, lastWatchedAt: new Date("2024-01-04") },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      movieTitle({
        mediaProviderId: 1,
        title: "Watched Once",
        watchCount: 1,
        lastActivityAt: new Date("2024-01-01"),
      }),
      movieTitle({
        mediaProviderId: 2,
        title: "Oldest Rewatch",
        watchCount: 3,
        lastActivityAt: new Date("2024-01-02"),
      }),
      movieTitle({
        mediaProviderId: 3,
        title: "Middle Rewatch",
        watchCount: 3,
        lastActivityAt: new Date("2024-01-03"),
      }),
      movieTitle({
        mediaProviderId: 4,
        title: "Newest Rewatch",
        watchCount: 3,
        lastActivityAt: new Date("2024-01-04"),
      }),
    ]);

    const summary = await getRecommendationTasteSummary("user-1");

    // Seed movie limit is 3 — the single-watch title never makes it in,
    // and among the tied 3x-watched titles, most-recent-first wins the tie.
    expect(summary.seedMovies.map((seed) => seed.title)).toEqual([
      "Newest Rewatch",
      "Middle Rewatch",
      "Oldest Rewatch",
    ]);
  });

  it("ranks show seed titles by rewatched episode count, not raw watched count", async () => {
    getShowWatchAggregates.mockResolvedValue([
      {
        showProviderId: 1,
        watchedEpisodeCount: 50,
        rewatchedEpisodeCount: 0,
        totalEpisodeEvents: 50,
        lastActivityAt: new Date("2024-01-01"),
      },
      {
        showProviderId: 2,
        watchedEpisodeCount: 5,
        rewatchedEpisodeCount: 3,
        totalEpisodeEvents: 8,
        lastActivityAt: new Date("2024-01-02"),
      },
      {
        showProviderId: 3,
        watchedEpisodeCount: 4,
        rewatchedEpisodeCount: 0,
        totalEpisodeEvents: 4,
        lastActivityAt: new Date("2024-01-03"),
      },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      showTitle({
        mediaProviderId: 1,
        title: "Watched A Lot, Never Rewatched",
        watchedEpisodeCount: 50,
        rewatchedEpisodeCount: 0,
      }),
      showTitle({
        mediaProviderId: 2,
        title: "Actually Rewatched",
        watchedEpisodeCount: 5,
        rewatchedEpisodeCount: 3,
      }),
      showTitle({
        mediaProviderId: 3,
        title: "Never Rewatched",
        watchedEpisodeCount: 4,
        rewatchedEpisodeCount: 0,
      }),
    ]);

    const summary = await getRecommendationTasteSummary("user-1");
    expect(summary.seedShows[0]?.title).toBe("Actually Rewatched");
  });

  it("reports enough data for personalization from seeds alone, even below the genre threshold", async () => {
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date("2024-01-01") },
      { movieProviderId: 2, watchCount: 1, lastWatchedAt: new Date("2024-01-02") },
      { movieProviderId: 3, watchCount: 1, lastWatchedAt: new Date("2024-01-03") },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      movieTitle({ mediaProviderId: 1, genres: [] }),
      movieTitle({ mediaProviderId: 2, genres: [] }),
      movieTitle({ mediaProviderId: 3, genres: [] }),
    ]);

    const summary = await getRecommendationTasteSummary("user-1");
    expect(summary.hasEnoughDataForPersonalization).toBe(true);
    expect(summary.movieGenreAffinities).toEqual([]);
  });
});
