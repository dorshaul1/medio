import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const listMediaRatings = vi.fn();
vi.mock("@/server/opinions/ratings", () => ({ listMediaRatings: () => listMediaRatings() }));

const getPersonDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getPersonDetails: (...args: unknown[]) => getPersonDetails(...args),
}));

const getViewingVolume = vi.fn();
const getTrackingStateCounts = vi.fn();
const getRecentViewingTimestamps = vi.fn();
vi.mock("./aggregates", () => ({
  getViewingVolume: (...args: unknown[]) => getViewingVolume(...args),
  getTrackingStateCounts: (...args: unknown[]) => getTrackingStateCounts(...args),
  getRecentViewingTimestamps: (...args: unknown[]) => getRecentViewingTimestamps(...args),
}));

const getMovieWatchAggregates = vi.fn();
const getShowWatchAggregates = vi.fn();
vi.mock("./candidates", () => ({
  getMovieWatchAggregates: (...args: unknown[]) => getMovieWatchAggregates(...args),
  getShowWatchAggregates: (...args: unknown[]) => getShowWatchAggregates(...args),
}));

const hydrateTasteTitles = vi.fn();
vi.mock("./hydrate", () => ({
  hydrateTasteTitles: (...args: unknown[]) => hydrateTasteTitles(...args),
}));

const { getStatsProfile } = await import("./compose");

const EMPTY_VOLUME = {
  uniqueMoviesWatched: 0,
  movieWatchEventCount: 0,
  uniqueEpisodesWatched: 0,
  episodeWatchEventCount: 0,
  uniqueShowsWatched: 0,
  watchedThisYearCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue({ user: { id: "user-1" } });
  getTrackingStateCounts.mockResolvedValue({ watching: 0, onHold: 0, dropped: 0 });
  listMediaRatings.mockResolvedValue([]);
  getMovieWatchAggregates.mockResolvedValue([]);
  getShowWatchAggregates.mockResolvedValue([]);
  hydrateTasteTitles.mockResolvedValue([]);
  getRecentViewingTimestamps.mockResolvedValue([]);
});

describe("getStatsProfile", () => {
  it("reports no history for a brand-new user, with a sparse headline", async () => {
    getViewingVolume.mockResolvedValue(EMPTY_VOLUME);

    const profile = await getStatsProfile();

    expect(profile.hasAnyHistory).toBe(false);
    expect(profile.headline).toEqual({ kind: "sparse" });
    expect(profile.viewingTimeline).toBeNull();
    expect(profile.estimatedViewingTime).toBeNull();
    expect(profile.genres).toEqual({ mostWatched: [], highestRated: [] });
    expect(profile.directors).toEqual([]);
    expect(profile.rewatch).toEqual({
      mostRewatchedMovie: null,
      mostRevisitedShow: null,
      rewatchRatePercent: null,
    });
  });

  it("produces a 12-entry viewing timeline once there is any history at all", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 1 });
    getRecentViewingTimestamps.mockResolvedValue([new Date()]);

    const profile = await getStatsProfile();
    expect(profile.viewingTimeline).toHaveLength(12);
  });

  it("reports history once at least one movie has been watched", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 1 });
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 550, watchCount: 1, lastWatchedAt: new Date() },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      {
        mediaType: "movie",
        mediaProviderId: 550,
        title: "Fight Club",
        poster: null,
        year: 1999,
        genres: [],
        rating: null,
        lastActivityAt: new Date(),
        cast: [],
        watchCount: 1,
        directors: [],
      },
    ]);

    const profile = await getStatsProfile();
    expect(profile.hasAnyHistory).toBe(true);
  });

  it("attaches real title/poster to the most rewatched movie from the hydrated set", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 1 });
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 550, watchCount: 3, lastWatchedAt: new Date("2024-01-01") },
    ]);
    hydrateTasteTitles.mockResolvedValue([
      {
        mediaType: "movie",
        mediaProviderId: 550,
        title: "Fight Club",
        poster: { path: "/poster.jpg" },
        year: 1999,
        genres: [],
        rating: null,
        lastActivityAt: new Date("2024-01-01"),
        cast: [],
        watchCount: 3,
        directors: [],
      },
    ]);

    const profile = await getStatsProfile();
    expect(profile.rewatch.mostRewatchedMovie).toEqual({
      mediaProviderId: 550,
      title: "Fight Club",
      poster: { path: "/poster.jpg" },
      watchCount: 3,
    });
  });

  it("hydrates director portraits after ranking, tolerating a lookup failure", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 2 });
    listMediaRatings.mockResolvedValue([
      {
        mediaType: "movie",
        mediaProviderId: 1,
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        mediaType: "movie",
        mediaProviderId: 2,
        rating: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date() },
      { movieProviderId: 2, watchCount: 1, lastWatchedAt: new Date() },
    ]);
    const director = { id: 525, name: "Christopher Nolan" };
    hydrateTasteTitles.mockResolvedValue([
      {
        mediaType: "movie",
        mediaProviderId: 1,
        title: "Movie 1",
        poster: null,
        year: 2010,
        genres: [],
        rating: 5,
        lastActivityAt: new Date(),
        cast: [],
        watchCount: 1,
        directors: [director],
      },
      {
        mediaType: "movie",
        mediaProviderId: 2,
        title: "Movie 2",
        poster: null,
        year: 2014,
        genres: [],
        rating: 4,
        lastActivityAt: new Date(),
        cast: [],
        watchCount: 1,
        directors: [director],
      },
    ]);
    getPersonDetails.mockRejectedValue(new Error("TMDB unavailable"));

    const profile = await getStatsProfile();
    expect(profile.directors).toHaveLength(1);
    expect(profile.directors[0]?.name).toBe("Christopher Nolan");
    expect(profile.directors[0]?.profile).toBeNull();
  });
});
