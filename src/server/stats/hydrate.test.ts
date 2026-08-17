import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MovieCredits, MovieDetails, ShowCredits, ShowDetails } from "@/server/media/types";

vi.mock("server-only", () => ({}));

const getMovieDetails = vi.fn();
const getMovieCredits = vi.fn();
const getShowDetails = vi.fn();
const getShowAggregateCredits = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
  getMovieCredits: (...args: unknown[]) => getMovieCredits(...args),
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
  getShowAggregateCredits: (...args: unknown[]) => getShowAggregateCredits(...args),
}));

const { hydrateTasteTitles } = await import("./hydrate");

const DRAMA = { id: 1, name: "Drama" };

function movieDetails(overrides: Partial<MovieDetails> = {}): MovieDetails {
  return {
    id: 550,
    mediaType: "movie",
    title: "Fight Club",
    originalTitle: "Fight Club",
    overview: null,
    tagline: null,
    status: "Released",
    genres: [DRAMA],
    poster: null,
    backdrop: null,
    providerRating: 8.4,
    voteCount: 100,
    originalLanguage: "en",
    releaseDate: "1999-10-15",
    releaseYear: 1999,
    runtimeMinutes: 139,
    productionCountries: [],
    collection: null,
    ...overrides,
  };
}

function showDetails(overrides: Partial<ShowDetails> = {}): ShowDetails {
  return {
    id: 1399,
    mediaType: "show",
    title: "Winter's Watch",
    originalTitle: "Winter's Watch",
    overview: null,
    tagline: null,
    status: "Ended",
    genres: [DRAMA],
    poster: null,
    backdrop: null,
    providerRating: 8.4,
    voteCount: 100,
    originalLanguage: "en",
    firstAirDate: "2011-04-17",
    firstAirYear: 2011,
    lastAirDate: "2019-05-19",
    numberOfSeasons: 8,
    numberOfEpisodes: 73,
    episodeRuntimeMinutes: 55,
    seasons: [],
    creators: [{ id: 9813, name: "Show Creator" }],
    nextEpisodeToAir: null,
    lastEpisodeToAir: null,
    ...overrides,
  };
}

function movieCredits(overrides: Partial<MovieCredits> = {}): MovieCredits {
  return {
    directors: [{ id: 7467, name: "David Fincher" }],
    cast: [{ id: 819, name: "Edward Norton", character: "The Narrator", profile: null }],
    ...overrides,
  };
}

function showCredits(overrides: Partial<ShowCredits> = {}): ShowCredits {
  return {
    cast: [{ id: 22970, name: "Peter Dinklage", character: "Tyrion", profile: null }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("hydrateTasteTitles", () => {
  it("fetches only details (no credits) when fetchCredits is false", async () => {
    getMovieDetails.mockResolvedValue(movieDetails());

    const [title] = await hydrateTasteTitles({
      movies: [
        { movieProviderId: 550, watchCount: 1, lastWatchedAt: new Date(), fetchCredits: false },
      ],
      shows: [],
    });

    expect(getMovieCredits).not.toHaveBeenCalled();
    expect(title?.mediaType).toBe("movie");
    if (title?.mediaType === "movie") {
      expect(title.directors).toEqual([]);
      expect(title.cast).toEqual([]);
      expect(title.genres).toEqual([DRAMA]);
      expect(title.runtimeMinutes).toBe(139);
    }
  });

  it("also fetches credits when fetchCredits is true, populating directors and cast", async () => {
    getMovieDetails.mockResolvedValue(movieDetails());
    getMovieCredits.mockResolvedValue(movieCredits());

    const [title] = await hydrateTasteTitles({
      movies: [
        { movieProviderId: 550, watchCount: 1, lastWatchedAt: new Date(), fetchCredits: true },
      ],
      shows: [],
    });

    expect(getMovieCredits).toHaveBeenCalledWith(550);
    if (title?.mediaType === "movie") {
      expect(title.directors).toEqual([{ id: 7467, name: "David Fincher" }]);
      expect(title.cast[0]?.name).toBe("Edward Norton");
    }
  });

  it("populates Show creators for free, without an extra fetch", async () => {
    getShowDetails.mockResolvedValue(showDetails());

    const [title] = await hydrateTasteTitles({
      movies: [],
      shows: [
        {
          showProviderId: 1399,
          watchedEpisodeCount: 10,
          rewatchedEpisodeCount: 0,
          totalEpisodeEvents: 10,
          lastActivityAt: new Date(),
          fetchCredits: false,
        },
      ],
    });

    expect(getShowAggregateCredits).not.toHaveBeenCalled();
    if (title?.mediaType === "show") {
      expect(title.creators).toEqual([{ id: 9813, name: "Show Creator" }]);
      expect(title.episodeRuntimeMinutes).toBe(55);
    }
  });

  it("fetches aggregate cast credits only when fetchCredits is true for a Show", async () => {
    getShowDetails.mockResolvedValue(showDetails());
    getShowAggregateCredits.mockResolvedValue(showCredits());

    const [title] = await hydrateTasteTitles({
      movies: [],
      shows: [
        {
          showProviderId: 1399,
          watchedEpisodeCount: 10,
          rewatchedEpisodeCount: 0,
          totalEpisodeEvents: 10,
          lastActivityAt: new Date(),
          fetchCredits: true,
        },
      ],
    });

    expect(getShowAggregateCredits).toHaveBeenCalledWith(1399);
    if (title?.mediaType === "show") {
      expect(title.cast[0]?.name).toBe("Peter Dinklage");
    }
  });

  it("omits a title entirely when its provider hydration fails, without throwing", async () => {
    getMovieDetails.mockRejectedValue(new Error("TMDB unavailable"));

    const titles = await hydrateTasteTitles({
      movies: [
        { movieProviderId: 550, watchCount: 1, lastWatchedAt: new Date(), fetchCredits: false },
      ],
      shows: [],
    });

    expect(titles).toEqual([]);
  });
});
