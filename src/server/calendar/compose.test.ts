import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MovieDetails, SeasonSummary, ShowDetails } from "@/server/media/types";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const getShowDetails = vi.fn();
const getSeasonDetails = vi.fn();
const getMovieDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
  getSeasonDetails: (...args: unknown[]) => getSeasonDetails(...args),
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
}));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { startWatchingShow } = await import("@/server/tracking/show-state");
const { recordEpisodeWatch } = await import("@/server/tracking/episode-events");
const { addToWatchlist, addToBacklog } = await import("@/server/planning/planning-items");
const { getCalendarEvents } = await import("./compose");

const SHOW_ACTIVE = 2001; // watching, caught up except for a just-aired episode
const SHOW_UPCOMING = 2002; // watching, next episode is in the future
const SHOW_BACKLOG = 2003; // saved to Backlog, not yet tracked
const SHOW_WATCHLIST = 2004; // saved to Watchlist, not yet tracked
const MOVIE_BACKLOG = 3001;

const NOW = new Date(Date.UTC(2026, 7, 17)); // Aug 17, 2026

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
    status: "Post Production",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 0,
    voteCount: 0,
    originalLanguage: "en",
    releaseDate: "2026-08-21",
    releaseYear: 2026,
    runtimeMinutes: 100,
    productionCountries: [],
    collection: null,
    ...overrides,
  };
}

function episodeFixture(seasonNumber: number, episodeNumber: number, airDate: string, id: number) {
  return {
    id,
    episodeNumber,
    seasonNumber,
    title: `S${seasonNumber}E${episodeNumber}`,
    overview: "Spoiler-laden overview Calendar must never render.",
    runtimeMinutes: 42,
    airDate,
    still: null,
    providerRating: 0,
  };
}

function seasonDetails(
  showId: number,
  seasonNumber: number,
  episodes: ReturnType<typeof episodeFixture>[],
) {
  return {
    showId,
    id: seasonNumber,
    seasonNumber,
    title: `Season ${seasonNumber}`,
    overview: null,
    airDate: "2020-01-01",
    poster: null,
    episodes,
  };
}

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
  getShowDetails.mockReset();
  getSeasonDetails.mockReset();
  getMovieDetails.mockReset();
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("getCalendarEvents", () => {
  it("a user with no tracking or planning history gets no events", async () => {
    const events = await getCalendarEvents(NOW);
    expect(events).toEqual([]);
  });

  it("an actively watched show whose next episode already aired unwatched surfaces a recent 'new episode' event", async () => {
    await startWatchingShow(SHOW_ACTIVE);
    await recordEpisodeWatch({
      showProviderId: SHOW_ACTIVE,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });

    getShowDetails.mockImplementation(async (id: number) => show({ id }));
    getSeasonDetails.mockImplementation(async (id: number, seasonNumber: number) =>
      seasonDetails(id, seasonNumber, [
        episodeFixture(1, 1, "2020-01-01", 1),
        episodeFixture(1, 2, "2026-08-16", 2), // aired yesterday, unwatched
      ]),
    );

    const events = await getCalendarEvents(NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "episode",
      relevance: "activeShow",
      hasAired: true,
      date: "2026-08-16",
      showProviderId: SHOW_ACTIVE,
      episodeNumber: 2,
    });
  });

  it("a watched show with a future scheduled episode surfaces one upcoming event, not a recent one", async () => {
    await startWatchingShow(SHOW_UPCOMING);
    await recordEpisodeWatch({
      showProviderId: SHOW_UPCOMING,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 10,
    });

    getShowDetails.mockImplementation(async (id: number) =>
      show({
        id,
        seasons: [season(1, 1)],
        nextEpisodeToAir: episodeFixture(2, 1, "2026-08-24", 11),
      }),
    );
    getSeasonDetails.mockImplementation(async (id: number, seasonNumber: number) =>
      seasonDetails(id, seasonNumber, [episodeFixture(1, 1, "2020-01-01", 10)]),
    );

    const events = await getCalendarEvents(NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      hasAired: false,
      date: "2026-08-24",
      seasonNumber: 2,
      episodeNumber: 1,
      isSeasonPremiere: true,
    });
  });

  it("a Backlog show's upcoming episode is ranked with backlogShow relevance", async () => {
    await addToBacklog("show", SHOW_BACKLOG);
    getShowDetails.mockImplementation(async (id: number) =>
      show({ id, nextEpisodeToAir: episodeFixture(3, 1, "2026-09-01", 20) }),
    );

    const events = await getCalendarEvents(NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ relevance: "backlogShow", date: "2026-09-01" });
  });

  it("a Watchlist show's recent series premiere surfaces with watchlistShow relevance", async () => {
    await addToWatchlist("show", SHOW_WATCHLIST);
    getShowDetails.mockImplementation(async (id: number) =>
      show({ id, lastEpisodeToAir: episodeFixture(1, 1, "2026-08-15", 30) }),
    );

    const events = await getCalendarEvents(NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      relevance: "watchlistShow",
      isShowPremiere: true,
      date: "2026-08-15",
    });
  });

  it("a planned show's ordinary mid-season last-aired episode is not surfaced", async () => {
    await addToWatchlist("show", SHOW_WATCHLIST);
    getShowDetails.mockImplementation(async (id: number) =>
      show({ id, lastEpisodeToAir: episodeFixture(2, 4, "2026-08-15", 31) }),
    );

    const events = await getCalendarEvents(NOW);
    expect(events).toEqual([]);
  });

  it("a Backlog movie surfaces a MovieReleaseEvent", async () => {
    await addToBacklog("movie", MOVIE_BACKLOG);
    getMovieDetails.mockImplementation(async (id: number) => movie({ id }));

    const events = await getCalendarEvents(NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "movieRelease",
      relevance: "backlogMovie",
      date: "2026-08-21",
    });
  });

  it("one candidate's provider hydration failing doesn't break the rest", async () => {
    await startWatchingShow(SHOW_ACTIVE);
    await addToBacklog("show", SHOW_BACKLOG);

    getShowDetails.mockImplementation(async (id: number) => {
      if (id === SHOW_BACKLOG) throw new Error("TMDB unavailable");
      return show({ id, seasons: [season(1, 1)] });
    });
    getSeasonDetails.mockImplementation(async (id: number, seasonNumber: number) =>
      seasonDetails(id, seasonNumber, [episodeFixture(1, 1, "2026-08-16", 40)]),
    );

    const events = await getCalendarEvents(NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ showProviderId: SHOW_ACTIVE });
  });
});
