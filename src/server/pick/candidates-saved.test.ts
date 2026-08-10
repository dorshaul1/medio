import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const listPlanningItems = vi.fn();
vi.mock("@/server/planning/planning-items", () => ({
  listPlanningItems: (...args: unknown[]) => listPlanningItems(...args),
}));

const getMovieDetails = vi.fn();
const getShowDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
}));

const { getSavedCandidates } = await import("./candidates-saved");

function movieDetails(overrides: Record<string, unknown> = {}) {
  return {
    mediaType: "movie",
    id: 1,
    title: "A Movie",
    originalTitle: "A Movie",
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
    ...overrides,
  };
}

function showDetails(overrides: Record<string, unknown> = {}) {
  return {
    mediaType: "show",
    id: 2,
    title: "A Show",
    originalTitle: "A Show",
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
    ...overrides,
  };
}

describe("getSavedCandidates", () => {
  it("hydrates both a saved movie and a saved show", async () => {
    listPlanningItems.mockResolvedValue([
      {
        mediaType: "movie",
        mediaProviderId: 1,
        intent: "backlog",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        mediaType: "show",
        mediaProviderId: 2,
        intent: "watchlist",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    getMovieDetails.mockResolvedValue(movieDetails());
    getShowDetails.mockResolvedValue(showDetails());

    const result = await getSavedCandidates();

    expect(result.movies).toEqual([
      expect.objectContaining({ kind: "savedMovie", mediaProviderId: 1, intent: "backlog" }),
    ]);
    expect(result.shows).toEqual([
      expect.objectContaining({ kind: "savedShow", mediaProviderId: 2, intent: "watchlist" }),
    ]);
  });

  it("omits a title whose provider hydration fails, without throwing", async () => {
    listPlanningItems.mockResolvedValue([
      {
        mediaType: "movie",
        mediaProviderId: 1,
        intent: "watchlist",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    getMovieDetails.mockRejectedValue(new Error("TMDB unavailable"));

    const result = await getSavedCandidates();
    expect(result.movies).toEqual([]);
  });

  it("returns empty pools when nothing is saved", async () => {
    listPlanningItems.mockResolvedValue([]);
    const result = await getSavedCandidates();
    expect(result).toEqual({ movies: [], shows: [] });
  });
});
