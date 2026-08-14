import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MovieDetails, SeasonSummary, ShowDetails } from "@/server/media/types";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const getShowDetails = vi.fn();
const getMovieDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
}));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { addToWatchlist, addToBacklog } = await import("@/server/planning/planning-items");
const { getHomeBacklogPreview } = await import("./backlog");

const SHOW_BACKLOG = 4001;
const MOVIE_BACKLOG = 4002;
const SHOW_WATCHLIST = 4003;

let userId: string;

function season(seasonNumber: number, episodeCount: number): SeasonSummary {
  return {
    id: seasonNumber,
    seasonNumber,
    title: `Season ${seasonNumber}`,
    overview: null,
    airDate: "2020-01-01",
    episodeCount,
    poster: null,
  };
}

function show(overrides: Partial<ShowDetails> & { id: number }): ShowDetails {
  return {
    mediaType: "show",
    title: `Show ${overrides.id}`,
    originalTitle: `Show ${overrides.id}`,
    overview: null,
    tagline: null,
    status: "Returning Series",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 8,
    voteCount: 100,
    originalLanguage: "en",
    firstAirDate: "2020-01-01",
    firstAirYear: 2020,
    lastAirDate: null,
    numberOfSeasons: 1,
    numberOfEpisodes: 2,
    episodeRuntimeMinutes: 45,
    seasons: [season(1, 2)],
    creators: [],
    nextEpisodeToAir: null,
    lastEpisodeToAir: null,
    ...overrides,
  };
}

function movie(overrides: Partial<MovieDetails> & { id: number }): MovieDetails {
  return {
    mediaType: "movie",
    title: `Movie ${overrides.id}`,
    originalTitle: `Movie ${overrides.id}`,
    overview: null,
    tagline: null,
    status: "Released",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 0,
    voteCount: 0,
    originalLanguage: "en",
    releaseDate: "2019-01-01",
    releaseYear: 2019,
    runtimeMinutes: 100,
    productionCountries: [],
    collection: null,
    ...overrides,
  };
}

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
  getShowDetails.mockReset();
  getMovieDetails.mockReset();
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("getHomeBacklogPreview", () => {
  it("a user with no planning history gets an empty preview", async () => {
    const preview = await getHomeBacklogPreview();
    expect(preview).toEqual([]);
  });

  it("includes Backlog shows and movies, hydrated with real provider metadata", async () => {
    await addToBacklog("show", SHOW_BACKLOG);
    await addToBacklog("movie", MOVIE_BACKLOG);
    getShowDetails.mockImplementation(async (id: number) => show({ id }));
    getMovieDetails.mockImplementation(async (id: number) => movie({ id }));

    const preview = await getHomeBacklogPreview();
    expect(preview).toHaveLength(2);
    expect(preview.map((item) => item.mediaProviderId).sort()).toEqual(
      [SHOW_BACKLOG, MOVIE_BACKLOG].sort(),
    );
  });

  it("never includes Watchlist items — only the stronger Backlog intent", async () => {
    await addToWatchlist("show", SHOW_WATCHLIST);
    getShowDetails.mockImplementation(async (id: number) => show({ id }));

    const preview = await getHomeBacklogPreview();
    expect(preview).toEqual([]);
  });

  it("degrades gracefully when one title's provider hydration fails", async () => {
    await addToBacklog("show", SHOW_BACKLOG);
    await addToBacklog("movie", MOVIE_BACKLOG);
    getShowDetails.mockRejectedValue(new Error("provider unavailable"));
    getMovieDetails.mockImplementation(async (id: number) => movie({ id }));

    const preview = await getHomeBacklogPreview();
    expect(preview).toHaveLength(1);
    expect(preview[0]?.mediaProviderId).toBe(MOVIE_BACKLOG);
  });
});
