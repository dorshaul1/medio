import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SeasonSummary, ShowDetails } from "@/server/media/types";

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
const { getWeeklyReleaseCount } = await import("./weekly-count");

const SHOW_ID = 4001;
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
    numberOfEpisodes: 1,
    episodeRuntimeMinutes: 45,
    seasons: [season(1, 1)],
    creators: [],
    nextEpisodeToAir: null,
    lastEpisodeToAir: null,
    ...overrides,
  };
}

function episodeFixture(seasonNumber: number, episodeNumber: number, airDate: string, id: number) {
  return {
    id,
    episodeNumber,
    seasonNumber,
    title: `S${seasonNumber}E${episodeNumber}`,
    overview: "",
    runtimeMinutes: 42,
    airDate,
    still: null,
    providerRating: 0,
  };
}

function seasonDetails(showId: number, seasonNumber: number, episodes: unknown[]) {
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

describe("getWeeklyReleaseCount", () => {
  it("is 0 for a user with no tracking or planning history", async () => {
    expect(await getWeeklyReleaseCount(NOW)).toBe(0);
  });

  it("counts a within-the-week upcoming episode", async () => {
    await startWatchingShow(SHOW_ID);
    getShowDetails.mockResolvedValue(
      show({ id: SHOW_ID, nextEpisodeToAir: episodeFixture(1, 2, "2026-08-20", 2) }),
    );
    getSeasonDetails.mockResolvedValue(
      seasonDetails(SHOW_ID, 1, [episodeFixture(1, 1, "2026-08-01", 1)]),
    );

    expect(await getWeeklyReleaseCount(NOW)).toBe(1);
  });

  it("excludes a release further out than this week", async () => {
    await startWatchingShow(SHOW_ID);
    getShowDetails.mockResolvedValue(
      show({ id: SHOW_ID, nextEpisodeToAir: episodeFixture(1, 2, "2026-09-15", 2) }),
    );
    getSeasonDetails.mockResolvedValue(
      seasonDetails(SHOW_ID, 1, [episodeFixture(1, 1, "2026-08-01", 1)]),
    );

    expect(await getWeeklyReleaseCount(NOW)).toBe(0);
  });
});
