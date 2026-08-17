import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const getPersonDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getPersonDetails: (...args: unknown[]) => getPersonDetails(...args),
}));

const getViewingVolume = vi.fn();
const getTrackingStateCounts = vi.fn();
const getViewingTimestampsInRange = vi.fn();
const getYearlyActivityCounts = vi.fn();
vi.mock("./aggregates", () => ({
  getViewingVolume: (...args: unknown[]) => getViewingVolume(...args),
  getTrackingStateCounts: (...args: unknown[]) => getTrackingStateCounts(...args),
  getViewingTimestampsInRange: (...args: unknown[]) => getViewingTimestampsInRange(...args),
  getYearlyActivityCounts: (...args: unknown[]) => getYearlyActivityCounts(...args),
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

const { getStatsComparison, getStatsProfile } = await import("./compose");

const ALL_TIME = { kind: "all" as const };

const EMPTY_VOLUME = {
  uniqueMoviesWatched: 0,
  movieWatchEventCount: 0,
  uniqueEpisodesWatched: 0,
  episodeWatchEventCount: 0,
  uniqueShowsWatched: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue({ user: { id: "user-1" } });
  getTrackingStateCounts.mockResolvedValue({ watching: 0, onHold: 0, dropped: 0 });
  getMovieWatchAggregates.mockResolvedValue([]);
  getShowWatchAggregates.mockResolvedValue([]);
  hydrateTasteTitles.mockResolvedValue([]);
  getViewingTimestampsInRange.mockResolvedValue([]);
  getYearlyActivityCounts.mockResolvedValue([]);
});

describe("getStatsProfile", () => {
  it("reports no history for a brand-new user, with a sparse headline", async () => {
    getViewingVolume.mockResolvedValue(EMPTY_VOLUME);

    const profile = await getStatsProfile(ALL_TIME);

    expect(profile.hasAnyHistory).toBe(false);
    expect(profile.headline).toEqual({ kind: "sparse" });
    expect(profile.viewingRhythm).toBeNull();
    expect(profile.estimatedViewingTime).toBeNull();
    expect(profile.genres).toEqual({ mostWatched: [] });
    expect(profile.directors).toEqual([]);
    expect(profile.rewatch).toEqual({
      mostRewatchedMovie: null,
      mostRevisitedShow: null,
      rewatchRatePercent: null,
    });
  });

  it("echoes back the exact range it was computed for", async () => {
    getViewingVolume.mockResolvedValue(EMPTY_VOLUME);
    const profile = await getStatsProfile({ kind: "year", year: 2025 });
    expect(profile.range).toEqual({ kind: "year", year: 2025 });
  });

  it("produces a yearly-granularity rhythm for All time once there is any history", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 1 });
    getYearlyActivityCounts.mockResolvedValue([{ year: 2026, eventCount: 3 }]);

    const profile = await getStatsProfile(ALL_TIME);
    expect(profile.viewingRhythm).toEqual({
      granularity: "year",
      buckets: [{ key: "2026", label: "2026", eventCount: 3 }],
    });
  });

  it("produces a monthly-granularity rhythm for a year range", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 1 });
    getViewingTimestampsInRange.mockResolvedValue([new Date(Date.UTC(2025, 5, 1))]);

    const profile = await getStatsProfile({ kind: "year", year: 2025 });
    expect(profile.viewingRhythm?.granularity).toBe("month");
    expect(profile.viewingRhythm?.buckets).toHaveLength(12);
  });

  it("produces a daily-granularity rhythm for a single month range", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 1 });
    getViewingTimestampsInRange.mockResolvedValue([new Date(Date.UTC(2026, 7, 10))]);

    const profile = await getStatsProfile({ kind: "month", year: 2026, month: 8 });
    expect(profile.viewingRhythm?.granularity).toBe("day");
    expect(profile.viewingRhythm?.buckets).toHaveLength(31);
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
        lastActivityAt: new Date(),
        cast: [],
        watchCount: 1,
        directors: [],
      },
    ]);

    const profile = await getStatsProfile(ALL_TIME);
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
        lastActivityAt: new Date("2024-01-01"),
        cast: [],
        watchCount: 3,
        directors: [],
      },
    ]);

    const profile = await getStatsProfile(ALL_TIME);
    expect(profile.rewatch.mostRewatchedMovie).toEqual({
      mediaProviderId: 550,
      title: "Fight Club",
      poster: { path: "/poster.jpg" },
      watchCount: 3,
    });
  });

  it("hydrates director portraits after ranking, tolerating a lookup failure", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 2 });
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
        lastActivityAt: new Date(),
        cast: [],
        watchCount: 1,
        directors: [director],
      },
    ]);
    getPersonDetails.mockRejectedValue(new Error("TMDB unavailable"));

    const profile = await getStatsProfile(ALL_TIME);
    expect(profile.directors).toHaveLength(1);
    expect(profile.directors[0]?.name).toBe("Christopher Nolan");
    expect(profile.directors[0]?.profile).toBeNull();
  });
});

describe("getStatsComparison", () => {
  it("returns null for 'all' — no meaningful previous period", async () => {
    expect(await getStatsComparison(ALL_TIME)).toBeNull();
  });

  it("fetches current and previous profiles, deriving a comparison", async () => {
    getViewingVolume
      .mockResolvedValueOnce({ ...EMPTY_VOLUME, uniqueMoviesWatched: 5 }) // current
      .mockResolvedValueOnce({ ...EMPTY_VOLUME, uniqueMoviesWatched: 2 }); // previous

    const result = await getStatsComparison({ kind: "year", year: 2026 });
    expect(result).not.toBeNull();
    expect(result?.current.overview.uniqueMoviesWatched).toBe(5);
    expect(result?.previous.overview.uniqueMoviesWatched).toBe(2);
    expect(result?.comparison?.facts).toContainEqual({
      kind: "movies",
      text: "You watched more Movies than 2025 (2 → 5).",
    });
  });

  it("never hydrates director portraits for the lightweight previous profile", async () => {
    getViewingVolume.mockResolvedValue({ ...EMPTY_VOLUME, uniqueMoviesWatched: 2 });
    getMovieWatchAggregates.mockResolvedValue([
      { movieProviderId: 1, watchCount: 1, lastWatchedAt: new Date() },
      { movieProviderId: 2, watchCount: 1, lastWatchedAt: new Date() },
    ]);
    const director = { id: 525, name: "Christopher Nolan" };
    // The same hydrated titles for both the current and previous profile
    // build — a real Director stat exists in *both*, so if the
    // `lightweight` previous profile still hydrated portraits, this
    // would call `getPersonDetails` twice, not once.
    hydrateTasteTitles.mockResolvedValue([
      {
        mediaType: "movie",
        mediaProviderId: 1,
        title: "Movie 1",
        poster: null,
        year: 2010,
        genres: [],
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
        lastActivityAt: new Date(),
        cast: [],
        watchCount: 1,
        directors: [director],
      },
    ]);
    getPersonDetails.mockResolvedValue({ profile: null });

    await getStatsComparison({ kind: "year", year: 2026 });
    expect(getPersonDetails).toHaveBeenCalledTimes(1);
  });
});
