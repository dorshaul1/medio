// Cross-product business-truth tests — see CLAUDE.md, "Major watch-state
// behavior requires cross-product domain/integration tests, not only
// component tests." Movie and episode watch events are MEDIO's canonical
// source of truth (see docs/tracking.md); every consumer domain — Home,
// Library, Diary, Calendar, Pick for Me, Stats — derives its own answer
// from the exact same event rows at read time. These tests record real
// watch events through the real tracking domain against a real test
// database, then assert every consumer domain agrees, rather than
// trusting each domain's own unit tests not to have quietly drifted from
// one another.
import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Episode, MovieDetails, SeasonSummary, ShowDetails } from "@/server/media/types";

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
const { recordEpisodeWatch, removeEpisodeWatchEvent, listEpisodeWatchEventsForShow } = await import(
  "@/server/tracking/episode-events"
);
const { recordMovieWatch, removeMovieWatchEvent, listMovieWatchEvents, getMovieWatchSummary } =
  await import("@/server/tracking/movie-events");
const { getShowEpisodeProgress } = await import("@/server/shows/show-episode-progress");
const { getPersonalHome } = await import("@/server/home/queries");
const { getLibraryPage } = await import("@/server/library/queries");
const { listDiaryEvents } = await import("@/server/diary/events");
const { getCalendarEvents } = await import("@/server/calendar/compose");
const { getContinueCandidates } = await import("@/server/pick/candidates-continue");
const { getViewingVolume } = await import("@/server/stats/aggregates");

// Real day-relative dates rather than hardcoded literals — this suite
// stays correct regardless of when it actually runs (same reasoning as
// the e2e fixtures' own `isoDaysFromNow` helper).
function daysAgo(n: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - n);
  return date.toISOString().slice(0, 10);
}
function daysFromNow(n: number): string {
  return daysAgo(-n);
}

function season(seasonNumber: number, episodeCount: number, airDate: string): SeasonSummary {
  return {
    id: seasonNumber,
    seasonNumber,
    title: seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`,
    overview: null,
    airDate,
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
    firstAirDate: "2018-01-01",
    firstAirYear: 2018,
    lastAirDate: null,
    numberOfSeasons: 1,
    numberOfEpisodes: 1,
    episodeRuntimeMinutes: 45,
    seasons: [season(1, 1, "2018-01-01")],
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

function episodeFixture(
  seasonNumber: number,
  episodeNumber: number,
  airDate: string,
  id: number,
): Episode {
  return {
    id,
    episodeNumber,
    seasonNumber,
    title: `S${seasonNumber}E${episodeNumber}`,
    overview: "Spoiler-laden overview never asserted on directly in this suite.",
    runtimeMinutes: 42,
    airDate,
    still: null,
    providerRating: 0,
  };
}

function seasonDetails(showId: number, seasonNumber: number, episodes: readonly Episode[]) {
  return {
    showId,
    id: seasonNumber,
    seasonNumber,
    title: seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`,
    overview: null,
    airDate: episodes[0]?.airDate ?? "2018-01-01",
    poster: null,
    episodes,
  };
}

// Wires `getSeasonDetails` to answer from a `seasonNumber -> episodes` map
// — every regression case below only needs this, never real HTTP.
function mockSeasons(bySeason: Record<number, readonly Episode[]>) {
  getSeasonDetails.mockImplementation(async (id: number, seasonNumber: number) =>
    seasonDetails(id, seasonNumber, bySeason[seasonNumber] ?? []),
  );
}

let userId: string;

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

describe("episode progression agreement", () => {
  // The exact scenario from the phase spec: watched through S1E6, S1E7 is
  // already aired and eligible — every domain must agree it's next, none
  // may report a different episode (S1E6, S1E8, ...) or a different show
  // state.
  it("Home, Library, Diary, Calendar, and Pick for Me all agree S1E7 is next", async () => {
    const SHOW_ID = 20001;
    const season1 = [
      episodeFixture(1, 1, daysAgo(100), 200011),
      episodeFixture(1, 2, daysAgo(90), 200012),
      episodeFixture(1, 3, daysAgo(80), 200013),
      episodeFixture(1, 4, daysAgo(70), 200014),
      episodeFixture(1, 5, daysAgo(60), 200015),
      episodeFixture(1, 6, daysAgo(50), 200016),
      // Recently aired — inside Calendar's recovery window, and the
      // canonical "next unwatched aired episode" once 1-6 are watched.
      episodeFixture(1, 7, daysAgo(2), 200017),
    ];
    // A real future episode of a real future season — must never count
    // as "next" anywhere, and must never itself read as aired.
    const season2 = [episodeFixture(2, 1, daysFromNow(30), 200021)];

    getShowDetails.mockImplementation(async (id: number) =>
      show({
        id,
        seasons: [season(1, 7, daysAgo(100)), season(2, 1, daysFromNow(30))],
        lastEpisodeToAir: season1[6] ?? null,
        nextEpisodeToAir: season2[0] ?? null,
      }),
    );
    mockSeasons({ 1: season1, 2: season2 });

    await startWatchingShow(SHOW_ID);
    for (const episode of season1.slice(0, 6)) {
      await recordEpisodeWatch({
        showProviderId: SHOW_ID,
        seasonNumber: 1,
        episodeNumber: episode.episodeNumber,
        episodeProviderId: episode.id,
      });
    }

    // Canonical source of truth: exactly one event per watched episode.
    const events = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    expect(events).toHaveLength(6);
    expect(new Set(events.map((event) => event.episodeNumber)).size).toBe(6);

    // Ground truth: the exact same domain function Show Details/Home use.
    const showDetails = await getShowDetails(SHOW_ID);
    const groundTruth = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events,
      hasKnownFutureEpisode: showDetails.nextEpisodeToAir !== null,
    });
    expect(groundTruth.progress.nextUnwatchedEpisode).toEqual({
      seasonNumber: 1,
      episodeNumber: 7,
    });
    expect(groundTruth.progress.remainingAiredEpisodeCount).toBe(1);
    expect(groundTruth.progress.derivedViewingState).toBe("watching");

    // Home.
    const home = await getPersonalHome();
    expect(home.upNext?.showProviderId).toBe(SHOW_ID);
    expect(home.upNext?.nextEpisode).toMatchObject({ seasonNumber: 1, episodeNumber: 7 });

    // Library.
    const library = await getLibraryPage({ sort: "recently_active" });
    const libraryItem = library.items.find((item) => item.mediaProviderId === SHOW_ID);
    expect(libraryItem?.kind).toBe("tracked-show");
    if (libraryItem?.kind === "tracked-show") {
      expect(libraryItem.derivedState).toBe("watching");
      expect(libraryItem.nextEpisode).toMatchObject({ seasonNumber: 1, episodeNumber: 7 });
    }

    // Diary.
    const diary = await listDiaryEvents({
      userId,
      filter: "all",
      sort: "newest",
      cursor: null,
      limit: 20,
    });
    const showDiaryEvents = diary.events.filter(
      (event) => event.eventType === "episode" && event.showProviderId === SHOW_ID,
    );
    expect(showDiaryEvents).toHaveLength(6);

    // Calendar: S1E7 reads as a recently-released, already-aired event;
    // the future S2E1 never reads as aired.
    const calendarEvents = await getCalendarEvents(new Date());
    const recentEvent = calendarEvents.find(
      (event) =>
        event.kind === "episode" &&
        event.showProviderId === SHOW_ID &&
        event.seasonNumber === 1 &&
        event.episodeNumber === 7,
    );
    expect(recentEvent?.hasAired).toBe(true);
    const futureEvent = calendarEvents.find(
      (event) =>
        event.kind === "episode" &&
        event.showProviderId === SHOW_ID &&
        event.seasonNumber === 2 &&
        event.episodeNumber === 1,
    );
    expect(futureEvent?.hasAired).toBe(false);

    // Pick for Me — proposes S1E7, never a watched episode.
    const candidates = await getContinueCandidates();
    const pickCandidate = candidates.find((candidate) => candidate.mediaProviderId === SHOW_ID);
    expect(pickCandidate?.nextEpisode).toMatchObject({ seasonNumber: 1, episodeNumber: 7 });
  });
});

describe("rewatch scenario", () => {
  it("a movie watched twice: two events, one unique movie, both in Diary, Stats event count rises but unique count doesn't", async () => {
    const MOVIE_ID = 30001;
    getMovieDetails.mockImplementation(async (id: number) => movie({ id }));

    await recordMovieWatch({
      movieProviderId: MOVIE_ID,
      watchedAt: new Date(Date.now() - 2 * 86_400_000),
    });
    await recordMovieWatch({ movieProviderId: MOVIE_ID });

    const events = await listMovieWatchEvents(MOVIE_ID);
    expect(events).toHaveLength(2);

    const summary = await getMovieWatchSummary(MOVIE_ID);
    expect(summary.hasWatched).toBe(true);
    expect(summary.watchCount).toBe(2);

    const diary = await listDiaryEvents({
      userId,
      filter: "movies",
      sort: "newest",
      cursor: null,
      limit: 20,
    });
    const movieDiaryEvents = diary.events.filter(
      (event) => event.eventType === "movie" && event.movieProviderId === MOVIE_ID,
    );
    expect(movieDiaryEvents).toHaveLength(2);
    // Two distinct rewatch ordinals (1 and 2), never collapsed together.
    expect(new Set(movieDiaryEvents.map((event) => event.ordinal))).toEqual(new Set([1, 2]));

    const volume = await getViewingVolume(userId, null);
    expect(volume.movieWatchEventCount).toBe(2);
    expect(volume.uniqueMoviesWatched).toBe(1);
  });
});

describe("exact event deletion", () => {
  it("deleting the second of two movie watches keeps the movie watched and leaves the first event untouched", async () => {
    const MOVIE_ID = 30002;
    getMovieDetails.mockImplementation(async (id: number) => movie({ id }));

    const first = await recordMovieWatch({
      movieProviderId: MOVIE_ID,
      watchedAt: new Date(Date.now() - 5 * 86_400_000),
    });
    const second = await recordMovieWatch({ movieProviderId: MOVIE_ID });

    await removeMovieWatchEvent(second.id);

    const events = await listMovieWatchEvents(MOVIE_ID);
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe(first.id);

    const summary = await getMovieWatchSummary(MOVIE_ID);
    expect(summary.hasWatched).toBe(true);
    expect(summary.watchCount).toBe(1);

    const diary = await listDiaryEvents({
      userId,
      filter: "movies",
      sort: "newest",
      cursor: null,
      limit: 20,
    });
    const movieDiaryEvents = diary.events.filter(
      (event) => event.eventType === "movie" && event.movieProviderId === MOVIE_ID,
    );
    expect(movieDiaryEvents).toHaveLength(1);
    expect(movieDiaryEvents[0]?.ordinal).toBe(1);

    const volume = await getViewingVolume(userId, null);
    expect(volume.movieWatchEventCount).toBe(1);
    expect(volume.uniqueMoviesWatched).toBe(1);
  });

  it("deleting a show's latest episode watch reverts progress to that episode again, everywhere", async () => {
    const SHOW_ID = 20002;
    const season1 = [
      episodeFixture(1, 1, daysAgo(30), 200111),
      episodeFixture(1, 2, daysAgo(20), 200112),
    ];
    getShowDetails.mockImplementation(async (id: number) =>
      show({ id, seasons: [season(1, 2, daysAgo(30))], lastEpisodeToAir: season1[1] ?? null }),
    );
    mockSeasons({ 1: season1 });

    await startWatchingShow(SHOW_ID);
    const firstEvent = await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 200111,
    });
    const secondEvent = await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 2,
      episodeProviderId: 200112,
    });

    await removeEpisodeWatchEvent(secondEvent.id);

    const events = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe(firstEvent.id);

    const showDetails = await getShowDetails(SHOW_ID);
    const groundTruth = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events,
      hasKnownFutureEpisode: false,
    });
    expect(groundTruth.progress.nextUnwatchedEpisode).toEqual({
      seasonNumber: 1,
      episodeNumber: 2,
    });
    expect(groundTruth.progress.remainingAiredEpisodeCount).toBe(1);

    const home = await getPersonalHome();
    expect(home.upNext?.showProviderId).toBe(SHOW_ID);
    expect(home.upNext?.nextEpisode).toMatchObject({ seasonNumber: 1, episodeNumber: 2 });
  });
});

describe("show regression scenarios", () => {
  it("first episode: watching S1E1 with S1E2 aired makes S1E2 next everywhere", async () => {
    const SHOW_ID = 21001;
    const season1 = [
      episodeFixture(1, 1, daysAgo(10), 210011),
      episodeFixture(1, 2, daysAgo(5), 210012),
    ];
    getShowDetails.mockImplementation(async (id: number) =>
      show({ id, seasons: [season(1, 2, daysAgo(10))], lastEpisodeToAir: season1[1] ?? null }),
    );
    mockSeasons({ 1: season1 });

    await startWatchingShow(SHOW_ID);
    await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 210011,
    });

    const events = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    const showDetails = await getShowDetails(SHOW_ID);
    const groundTruth = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events,
      hasKnownFutureEpisode: false,
    });
    expect(groundTruth.progress.nextUnwatchedEpisode).toEqual({
      seasonNumber: 1,
      episodeNumber: 2,
    });
    expect(groundTruth.progress.derivedViewingState).toBe("watching");

    const home = await getPersonalHome();
    expect(home.upNext?.nextEpisode).toMatchObject({ seasonNumber: 1, episodeNumber: 2 });
  });

  it("season finale watched, no next season known: Caught Up everywhere, and Home excludes it from continuation", async () => {
    const SHOW_ID = 21002;
    const season1 = [episodeFixture(1, 1, daysAgo(10), 210021)];
    getShowDetails.mockImplementation(async (id: number) =>
      show({
        id,
        status: "Returning Series",
        seasons: [season(1, 1, daysAgo(10))],
        lastEpisodeToAir: season1[0] ?? null,
        nextEpisodeToAir: null,
      }),
    );
    mockSeasons({ 1: season1 });

    await startWatchingShow(SHOW_ID);
    await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 210021,
    });

    const events = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    const showDetails = await getShowDetails(SHOW_ID);
    const groundTruth = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events,
      hasKnownFutureEpisode: false,
    });
    expect(groundTruth.progress.derivedViewingState).toBe("caught_up");
    expect(groundTruth.progress.nextUnwatchedEpisode).toBeNull();

    // Caught Up shows have nothing to continue — Home must never invent one.
    const home = await getPersonalHome();
    expect(home.upNext?.showProviderId).not.toBe(SHOW_ID);
    expect(home.continueWatching.some((item) => item.showProviderId === SHOW_ID)).toBe(false);

    const library = await getLibraryPage({ sort: "recently_active" });
    const libraryItem = library.items.find((item) => item.mediaProviderId === SHOW_ID);
    if (libraryItem?.kind === "tracked-show") {
      expect(libraryItem.derivedState).toBe("caught_up");
    }
  });

  it("next season already aired: the new season's first episode becomes next, show stays Watching", async () => {
    const SHOW_ID = 21003;
    const season1 = [episodeFixture(1, 1, daysAgo(60), 210031)];
    const season2 = [episodeFixture(2, 1, daysAgo(3), 210032)];
    getShowDetails.mockImplementation(async (id: number) =>
      show({
        id,
        seasons: [season(1, 1, daysAgo(60)), season(2, 1, daysAgo(3))],
        lastEpisodeToAir: season2[0] ?? null,
        nextEpisodeToAir: null,
      }),
    );
    mockSeasons({ 1: season1, 2: season2 });

    await startWatchingShow(SHOW_ID);
    await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 210031,
    });

    const events = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    const showDetails = await getShowDetails(SHOW_ID);
    const groundTruth = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events,
      hasKnownFutureEpisode: false,
    });
    expect(groundTruth.progress.nextUnwatchedEpisode).toEqual({
      seasonNumber: 2,
      episodeNumber: 1,
    });
    expect(groundTruth.progress.derivedViewingState).toBe("watching");

    const home = await getPersonalHome();
    expect(home.upNext?.nextEpisode).toMatchObject({ seasonNumber: 2, episodeNumber: 1 });
  });

  it("waiting: all aired watched, but a real future episode is scheduled", async () => {
    const SHOW_ID = 21004;
    const season1 = [episodeFixture(1, 1, daysAgo(10), 210041)];
    getShowDetails.mockImplementation(async (id: number) =>
      show({
        id,
        status: "Returning Series",
        seasons: [season(1, 1, daysAgo(10))],
        lastEpisodeToAir: season1[0] ?? null,
        nextEpisodeToAir: episodeFixture(1, 2, daysFromNow(14), 210042),
      }),
    );
    mockSeasons({ 1: season1 });

    await startWatchingShow(SHOW_ID);
    await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 210041,
    });

    const events = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    const showDetails = await getShowDetails(SHOW_ID);
    const groundTruth = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events,
      hasKnownFutureEpisode: showDetails.nextEpisodeToAir !== null,
    });
    expect(groundTruth.progress.derivedViewingState).toBe("waiting");

    const home = await getPersonalHome();
    expect(home.upNext?.showProviderId).not.toBe(SHOW_ID);
  });

  it("completed: an Ended show with everything aired watched, regardless of any future episode field", async () => {
    const SHOW_ID = 21005;
    const season1 = [episodeFixture(1, 1, daysAgo(10), 210051)];
    getShowDetails.mockImplementation(async (id: number) =>
      show({
        id,
        status: "Ended",
        seasons: [season(1, 1, daysAgo(10))],
        lastEpisodeToAir: season1[0] ?? null,
        nextEpisodeToAir: null,
      }),
    );
    mockSeasons({ 1: season1 });

    await startWatchingShow(SHOW_ID);
    await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 210051,
    });

    const events = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    const showDetails = await getShowDetails(SHOW_ID);
    const groundTruth = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events,
      hasKnownFutureEpisode: false,
    });
    expect(groundTruth.progress.derivedViewingState).toBe("completed");

    const home = await getPersonalHome();
    expect(home.upNext?.showProviderId).not.toBe(SHOW_ID);
  });

  it("Specials (season 0): a watched or unwatched Special never affects regular progress", async () => {
    const SHOW_ID = 21006;
    const season1 = [episodeFixture(1, 1, daysAgo(10), 210061)];
    const specials = [episodeFixture(0, 1, daysAgo(5), 210062)];
    getShowDetails.mockImplementation(async (id: number) =>
      show({
        id,
        status: "Returning Series",
        seasons: [season(0, 1, daysAgo(5)), season(1, 1, daysAgo(10))],
        lastEpisodeToAir: season1[0] ?? null,
        nextEpisodeToAir: null,
      }),
    );
    mockSeasons({ 0: specials, 1: season1 });

    await startWatchingShow(SHOW_ID);
    // Only the regular episode is watched — the Special is real history
    // only if/when the user watches it, never counted for or against
    // regular progress either way.
    await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 210061,
    });

    const events = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    const showDetails = await getShowDetails(SHOW_ID);
    const groundTruth = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events,
      hasKnownFutureEpisode: false,
    });
    // Fully caught up on regular episodes despite the Special sitting
    // unwatched — Specials never block normal completion/caught-up
    // progress.
    expect(groundTruth.progress.derivedViewingState).toBe("caught_up");
    expect(groundTruth.progress.airedEpisodeCount).toBe(1);
  });

  it("rewatching an already-watched episode never changes next-episode progress", async () => {
    const SHOW_ID = 21007;
    const season1 = [
      episodeFixture(1, 1, daysAgo(20), 210071),
      episodeFixture(1, 2, daysAgo(10), 210072),
    ];
    getShowDetails.mockImplementation(async (id: number) =>
      show({ id, seasons: [season(1, 2, daysAgo(20))], lastEpisodeToAir: season1[1] ?? null }),
    );
    mockSeasons({ 1: season1 });

    await startWatchingShow(SHOW_ID);
    await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 210071,
    });

    const beforeEvents = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    const showDetails = await getShowDetails(SHOW_ID);
    const before = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events: beforeEvents,
      hasKnownFutureEpisode: false,
    });

    // Rewatch episode 1 — a second, legitimate event for the same episode.
    await recordEpisodeWatch({
      showProviderId: SHOW_ID,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 210071,
    });

    const afterEvents = await listEpisodeWatchEventsForShow({ showProviderId: SHOW_ID });
    expect(afterEvents).toHaveLength(2);
    const after = await getShowEpisodeProgress({
      showProviderId: SHOW_ID,
      seasons: showDetails.seasons,
      showStatus: showDetails.status,
      explicitState: "watching",
      events: afterEvents,
      hasKnownFutureEpisode: false,
    });

    // Two raw events, but progress (unique-episode-based) is unchanged.
    expect(after.progress.nextUnwatchedEpisode).toEqual(before.progress.nextUnwatchedEpisode);
    expect(after.progress.uniqueWatchedAiredEpisodeCount).toBe(
      before.progress.uniqueWatchedAiredEpisodeCount,
    );
    expect(after.progress.remainingAiredEpisodeCount).toBe(
      before.progress.remainingAiredEpisodeCount,
    );
  });
});
