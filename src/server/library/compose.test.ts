import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MovieDetails, ShowDetails } from "@/server/media/types";
import type { LibraryCandidate } from "./candidates";

vi.mock("server-only", () => ({}));

const getMovieDetails = vi.fn();
const getShowDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
}));

const getWatchedEpisodeCountsByShow = vi.fn();
vi.mock("./candidates", () => ({
  getWatchedEpisodeCountsByShow: (...args: unknown[]) => getWatchedEpisodeCountsByShow(...args),
}));

const listMediaRatings = vi.fn();
vi.mock("@/server/opinions/ratings", () => ({
  listMediaRatings: (...args: unknown[]) => listMediaRatings(...args),
}));

const listEpisodeWatchEventsForShow = vi.fn();
vi.mock("@/server/tracking/episode-events", () => ({
  listEpisodeWatchEventsForShow: (...args: unknown[]) => listEpisodeWatchEventsForShow(...args),
}));

const getShowEpisodeProgress = vi.fn();
vi.mock("@/server/shows/show-episode-progress", () => ({
  getShowEpisodeProgress: (...args: unknown[]) => getShowEpisodeProgress(...args),
}));

const { composeLibraryItems } = await import("./compose");

function movie(overrides: Partial<MovieDetails> = {}): MovieDetails {
  return {
    id: 550,
    mediaType: "movie",
    title: "Fight Club",
    originalTitle: "Fight Club",
    overview: null,
    tagline: null,
    status: "Released",
    genres: [],
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

function show(overrides: Partial<ShowDetails> = {}): ShowDetails {
  return {
    id: 1399,
    mediaType: "show",
    title: "Winter's Watch",
    originalTitle: "Winter's Watch",
    overview: null,
    tagline: null,
    status: "Ended",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 8.5,
    voteCount: 100,
    originalLanguage: "en",
    firstAirDate: "2011-04-17",
    firstAirYear: 2011,
    lastAirDate: "2019-05-19",
    numberOfSeasons: 2,
    numberOfEpisodes: 20,
    episodeRuntimeMinutes: 55,
    seasons: [
      {
        id: 1,
        seasonNumber: 1,
        title: "Season 1",
        overview: null,
        airDate: "2011-04-17",
        episodeCount: 10,
        poster: null,
      },
    ],
    creators: [],
    nextEpisodeToAir: null,
    lastEpisodeToAir: null,
    ...overrides,
  };
}

function planningCandidate(overrides: Partial<LibraryCandidate> = {}): LibraryCandidate {
  return {
    kind: "planned-movie",
    mediaType: "movie",
    mediaProviderId: 550,
    intent: "watchlist",
    trackingStatus: null,
    watchCount: null,
    personalActivityAt: new Date("2024-01-01"),
    addedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("composeLibraryItems", () => {
  beforeEach(() => {
    getMovieDetails.mockReset();
    getShowDetails.mockReset();
    getWatchedEpisodeCountsByShow.mockReset().mockResolvedValue(new Map());
    listEpisodeWatchEventsForShow.mockReset().mockResolvedValue([]);
    getShowEpisodeProgress.mockReset();
    listMediaRatings.mockReset().mockResolvedValue([]);
  });

  it("composes a planned movie", async () => {
    getMovieDetails.mockResolvedValue(movie());
    const items = await composeLibraryItems("user-1", [planningCandidate()]);
    expect(items).toEqual([
      expect.objectContaining({ kind: "planned-movie", title: "Fight Club", intent: "watchlist" }),
    ]);
  });

  it("composes a watched movie using the candidate's aggregate watch data", async () => {
    getMovieDetails.mockResolvedValue(movie());
    const items = await composeLibraryItems("user-1", [
      planningCandidate({ kind: "watched-movie", intent: null, watchCount: 3 }),
    ]);
    expect(items[0]).toMatchObject({ kind: "watched-movie", watchCount: 3 });
  });

  it("composes a tracked show with an approximate progress and derived state", async () => {
    getShowDetails.mockResolvedValue(show());
    getWatchedEpisodeCountsByShow.mockResolvedValue(new Map([[1399, 10]]));

    const items = await composeLibraryItems("user-1", [
      planningCandidate({
        kind: "tracked-show",
        mediaType: "show",
        mediaProviderId: 1399,
        intent: null,
        trackingStatus: "watching",
      }),
    ]);

    expect(items[0]).toMatchObject({
      kind: "tracked-show",
      airedEpisodeCount: 10,
      watchedEpisodeCount: 10,
      derivedState: "completed",
    });
    // Completed has nothing to resume — the extra per-show hydration for
    // Library's quick action is never spent on it.
    expect(getShowEpisodeProgress).not.toHaveBeenCalled();
  });

  it("hydrates the exact next episode for a show that's actually still watching", async () => {
    getShowDetails.mockResolvedValue(show());
    getWatchedEpisodeCountsByShow.mockResolvedValue(new Map([[1399, 3]]));
    getShowEpisodeProgress.mockResolvedValue({
      progress: { nextUnwatchedEpisode: { seasonNumber: 1, episodeNumber: 4 } },
      episodes: [
        { id: 999, seasonNumber: 1, episodeNumber: 4, title: "Episode Four" },
        { id: 998, seasonNumber: 1, episodeNumber: 3, title: "Episode Three" },
      ],
    });

    const items = await composeLibraryItems("user-1", [
      planningCandidate({
        kind: "tracked-show",
        mediaType: "show",
        mediaProviderId: 1399,
        intent: null,
        trackingStatus: "watching",
      }),
    ]);

    expect(items[0]).toMatchObject({
      derivedState: "watching",
      nextEpisode: {
        seasonNumber: 1,
        episodeNumber: 4,
        episodeProviderId: 999,
        title: "Episode Four",
      },
    });
  });

  it("degrades to a null next episode (not a crash) when exact hydration fails", async () => {
    getShowDetails.mockResolvedValue(show());
    getWatchedEpisodeCountsByShow.mockResolvedValue(new Map([[1399, 3]]));
    getShowEpisodeProgress.mockRejectedValue(new Error("TMDB unavailable"));

    const items = await composeLibraryItems("user-1", [
      planningCandidate({
        kind: "tracked-show",
        mediaType: "show",
        mediaProviderId: 1399,
        intent: null,
        trackingStatus: "watching",
      }),
    ]);

    expect(items[0]).toMatchObject({ derivedState: "watching", nextEpisode: null });
  });

  it("skips (never crashes on) a title whose provider hydration fails", async () => {
    getMovieDetails.mockRejectedValue(new Error("TMDB 404"));
    const items = await composeLibraryItems("user-1", [planningCandidate()]);
    expect(items).toEqual([]);
  });

  it("deduplicates candidates by media type + provider id", async () => {
    getMovieDetails.mockResolvedValue(movie());
    const items = await composeLibraryItems("user-1", [planningCandidate(), planningCandidate()]);
    expect(items).toHaveLength(1);
  });

  it("attaches the user's own rating for a matching title, from one batched lookup", async () => {
    getMovieDetails.mockResolvedValue(movie());
    listMediaRatings.mockResolvedValue([
      {
        mediaType: "movie",
        mediaProviderId: 550,
        rating: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const items = await composeLibraryItems("user-1", [
      planningCandidate({ kind: "watched-movie", intent: null, watchCount: 1 }),
    ]);

    expect(items[0]).toMatchObject({ rating: 4 });
  });

  it("leaves rating null for an unrated title", async () => {
    getMovieDetails.mockResolvedValue(movie());
    const items = await composeLibraryItems("user-1", [planningCandidate()]);
    expect(items[0]).toMatchObject({ rating: null });
  });
});
