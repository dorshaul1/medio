import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getWatchedMovieIds = vi.fn();
vi.mock("@/server/tracking/movie-events", () => ({
  getWatchedMovieIds: (...args: unknown[]) => getWatchedMovieIds(...args),
}));

const getKnownShowIds = vi.fn();
vi.mock("@/server/tracking/show-state", () => ({
  getKnownShowIds: (...args: unknown[]) => getKnownShowIds(...args),
}));

const discoverMoviesByGenre = vi.fn();
const discoverShowsByGenre = vi.fn();
const getMovieDetails = vi.fn();
const getShowDetails = vi.fn();
const getMovieRecommendations = vi.fn();
const getShowRecommendations = vi.fn();
const getPersonCombinedCredits = vi.fn();
const getPopularMovies = vi.fn();
const getPopularShows = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  discoverMoviesByGenre: (...args: unknown[]) => discoverMoviesByGenre(...args),
  discoverShowsByGenre: (...args: unknown[]) => discoverShowsByGenre(...args),
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
  getMovieRecommendations: (...args: unknown[]) => getMovieRecommendations(...args),
  getShowRecommendations: (...args: unknown[]) => getShowRecommendations(...args),
  getPersonCombinedCredits: (...args: unknown[]) => getPersonCombinedCredits(...args),
  getPopularMovies: (...args: unknown[]) => getPopularMovies(...args),
  getPopularShows: (...args: unknown[]) => getPopularShows(...args),
}));

const { getDiscoveryCandidates } = await import("./candidates-discovery");

const EMPTY_TASTE = {
  hasEnoughDataForPersonalization: false,
  movieGenreAffinities: [],
  showGenreAffinities: [],
  topDirector: null,
  seedMovies: [],
  seedShows: [],
};

function summary(id: number, title = `Title ${id}`) {
  return {
    id,
    mediaType: "movie" as const,
    title,
    originalTitle: title,
    overview: null,
    releaseDate: null,
    releaseYear: 2020,
    poster: null,
    backdrop: null,
    providerRating: 7,
    voteCount: 500,
    genreIds: [],
    adult: false,
  };
}

function movieDetails(id: number) {
  return {
    mediaType: "movie",
    id,
    title: `Movie ${id}`,
    originalTitle: `Movie ${id}`,
    overview: null,
    tagline: null,
    status: "Released",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 7,
    voteCount: 100,
    originalLanguage: "en",
    releaseDate: "2020-01-01",
    releaseYear: 2020,
    runtimeMinutes: 100,
    productionCountries: [],
    collection: null,
  };
}

function showDetailsFixture(id: number) {
  return {
    mediaType: "show",
    id,
    title: `Show ${id}`,
    originalTitle: `Show ${id}`,
    overview: null,
    tagline: null,
    status: "Returning Series",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 7,
    voteCount: 100,
    originalLanguage: "en",
    firstAirDate: "2020-01-01",
    firstAirYear: 2020,
    lastAirDate: null,
    numberOfSeasons: 1,
    numberOfEpisodes: 10,
    episodeRuntimeMinutes: 45,
    seasons: [],
    creators: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getWatchedMovieIds.mockResolvedValue(new Set());
  getKnownShowIds.mockResolvedValue(new Set());
  getMovieRecommendations.mockResolvedValue([]);
  getShowRecommendations.mockResolvedValue([]);
  discoverMoviesByGenre.mockResolvedValue({ page: 1, totalPages: 1, totalResults: 0, items: [] });
  discoverShowsByGenre.mockResolvedValue({ page: 1, totalPages: 1, totalResults: 0, items: [] });
  getPopularMovies.mockResolvedValue([]);
  getPopularShows.mockResolvedValue([]);
  getMovieDetails.mockImplementation(async (id: number) => movieDetails(id));
  getShowDetails.mockImplementation(async (id: number) => showDetailsFixture(id));
});

describe("getDiscoveryCandidates", () => {
  it("falls back to popular movies/shows for a user with no taste data", async () => {
    getPopularMovies.mockResolvedValue([summary(1)]);
    getPopularShows.mockResolvedValue([summary(2)]);

    const result = await getDiscoveryCandidates({
      taste: EMPTY_TASTE,
      excludeMovieIds: new Set(),
      excludeShowIds: new Set(),
    });

    expect(result.movies).toEqual([
      expect.objectContaining({ mediaProviderId: 1, source: "popular" }),
    ]);
    expect(result.shows).toEqual([
      expect.objectContaining({ mediaProviderId: 2, source: "popular" }),
    ]);
  });

  it("never falls back to popular when a recommendation seed produced results", async () => {
    getMovieRecommendations.mockResolvedValue([summary(1)]);

    const result = await getDiscoveryCandidates({
      taste: { ...EMPTY_TASTE, seedMovies: [{ id: 99, title: "Seed" }] },
      excludeMovieIds: new Set(),
      excludeShowIds: new Set(),
    });

    expect(getPopularMovies).not.toHaveBeenCalled();
    expect(result.movies[0]).toMatchObject({ source: "recommendation", seedTitle: "Seed" });
  });

  it("names the director's own filmography as its source", async () => {
    getPersonCombinedCredits.mockResolvedValue({
      cast: [],
      crew: [
        {
          mediaType: "movie",
          mediaProviderId: 5,
          title: "Directed Movie",
          poster: null,
          year: 2015,
          voteCount: 10,
          job: "Director",
          department: "Directing",
        },
        {
          mediaType: "movie",
          mediaProviderId: 6,
          title: "Written Movie",
          poster: null,
          year: 2016,
          voteCount: 10,
          job: "Writer",
          department: "Writing",
        },
      ],
    });

    const result = await getDiscoveryCandidates({
      taste: { ...EMPTY_TASTE, topDirector: { id: 42, name: "A Director" } },
      excludeMovieIds: new Set(),
      excludeShowIds: new Set(),
    });

    expect(result.movies.map((m) => m.mediaProviderId)).toEqual([5]);
    expect(result.movies[0]?.source).toBe("director");
  });

  it("excludes already-saved/continuing ids before ever querying discovery exclusion", async () => {
    getMovieRecommendations.mockResolvedValue([summary(1), summary(2)]);

    const result = await getDiscoveryCandidates({
      taste: { ...EMPTY_TASTE, seedMovies: [{ id: 99, title: "Seed" }] },
      excludeMovieIds: new Set([1]),
      excludeShowIds: new Set(),
    });

    expect(result.movies.map((m) => m.mediaProviderId)).toEqual([2]);
    // Only the still-candidate id is checked against watch history — the
    // already-excluded one never needs it.
    expect(getWatchedMovieIds).toHaveBeenCalledWith([2]);
  });

  it("excludes movies the user has already watched, even if a provider recommended them", async () => {
    getMovieRecommendations.mockResolvedValue([summary(1)]);
    getWatchedMovieIds.mockResolvedValue(new Set([1]));

    const result = await getDiscoveryCandidates({
      taste: { ...EMPTY_TASTE, seedMovies: [{ id: 99, title: "Seed" }] },
      excludeMovieIds: new Set(),
      excludeShowIds: new Set(),
    });

    expect(result.movies).toEqual([]);
  });

  it("excludes shows the user already has a relationship with", async () => {
    getShowRecommendations.mockResolvedValue([summary(2)]);
    getKnownShowIds.mockResolvedValue(new Set([2]));

    const result = await getDiscoveryCandidates({
      taste: { ...EMPTY_TASTE, seedShows: [{ id: 99, title: "Seed Show" }] },
      excludeMovieIds: new Set(),
      excludeShowIds: new Set(),
    });

    expect(result.shows).toEqual([]);
  });

  it("deduplicates a title recommended by more than one seed, keeping first-seen source", async () => {
    getMovieRecommendations.mockImplementation(async (id: number) =>
      id === 10 ? [summary(1)] : [summary(1)],
    );

    const result = await getDiscoveryCandidates({
      taste: {
        ...EMPTY_TASTE,
        seedMovies: [
          { id: 10, title: "First Seed" },
          { id: 11, title: "Second Seed" },
        ],
      },
      excludeMovieIds: new Set(),
      excludeShowIds: new Set(),
    });

    expect(result.movies).toHaveLength(1);
    expect(result.movies[0]?.seedTitle).toBe("First Seed");
  });

  it("omits a candidate whose final hydration fails, without throwing", async () => {
    getMovieRecommendations.mockResolvedValue([summary(1)]);
    getMovieDetails.mockRejectedValue(new Error("TMDB unavailable"));

    const result = await getDiscoveryCandidates({
      taste: { ...EMPTY_TASTE, seedMovies: [{ id: 99, title: "Seed" }] },
      excludeMovieIds: new Set(),
      excludeShowIds: new Set(),
    });

    expect(result.movies).toEqual([]);
  });
});
