import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SeasonSummary, ShowDetails } from "@/server/media/types";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const getShowDetails = vi.fn();
const getSeasonDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
  getSeasonDetails: (...args: unknown[]) => getSeasonDetails(...args),
}));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { startWatchingShow, putShowOnHold, dropShow } = await import("@/server/tracking/show-state");
const { recordEpisodeWatch } = await import("@/server/tracking/episode-events");
const { getPersonalHome } = await import("./queries");

const SHOW_A = 1001; // "actively watching, one episode left"
const SHOW_B = 1002; // "on hold"
const SHOW_C = 1003; // "dropped"
const SHOW_D = 1004; // "caught up"
const SHOW_E = 1005; // "only a future episode aired-wise — nothing to watch yet"

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

function episodeFixture(
  seasonNumber: number,
  episodeNumber: number,
  airDate: string | null,
  id: number,
) {
  return {
    id,
    episodeNumber,
    seasonNumber,
    title: `S${seasonNumber}E${episodeNumber}`,
    overview: "Spoiler-laden overview that Home must never render.",
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
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("getPersonalHome", () => {
  it("a user with no tracking history gets a fully empty personal home", async () => {
    const result = await getPersonalHome();
    expect(result).toEqual({ upNext: null, finishSoon: [], continueWatching: [] });
  });

  it("an actively watching show with one unwatched aired episode becomes Up Next", async () => {
    await startWatchingShow(SHOW_A);
    await recordEpisodeWatch({
      showProviderId: SHOW_A,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });

    getShowDetails.mockImplementation(async (id: number) => show({ id }));
    getSeasonDetails.mockImplementation(async (id: number, seasonNumber: number) =>
      seasonDetails(id, seasonNumber, [
        episodeFixture(1, 1, "2020-01-01", 1),
        episodeFixture(1, 2, "2020-01-08", 2),
      ]),
    );

    const result = await getPersonalHome();

    expect(result.upNext).toMatchObject({
      showProviderId: SHOW_A,
      remainingAiredEpisodeCount: 1,
      nextEpisode: { seasonNumber: 1, episodeNumber: 2 },
    });
    // Spoiler safety — the episode's overview never appears in the model.
    expect(JSON.stringify(result.upNext)).not.toContain("Spoiler-laden");
  });

  it("excludes an On Hold show entirely", async () => {
    await putShowOnHold(SHOW_B);
    getShowDetails.mockImplementation(async (id: number) => show({ id }));
    getSeasonDetails.mockResolvedValue(seasonDetails(SHOW_B, 1, []));

    const result = await getPersonalHome();
    expect(result.upNext).toBeNull();
    expect(getShowDetails).not.toHaveBeenCalled();
  });

  it("excludes a Dropped show entirely", async () => {
    await dropShow(SHOW_C);
    getShowDetails.mockImplementation(async (id: number) => show({ id }));

    const result = await getPersonalHome();
    expect(result.upNext).toBeNull();
    expect(getShowDetails).not.toHaveBeenCalled();
  });

  it("excludes a fully Caught Up show from active continuation", async () => {
    await startWatchingShow(SHOW_D);
    await recordEpisodeWatch({
      showProviderId: SHOW_D,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 3,
    });

    getShowDetails.mockImplementation(async (id: number) => show({ id, seasons: [season(1, 1)] }));
    getSeasonDetails.mockImplementation(async (id: number, seasonNumber: number) =>
      seasonDetails(id, seasonNumber, [episodeFixture(1, 1, "2020-01-01", 3)]),
    );

    const result = await getPersonalHome();
    expect(result.upNext).toBeNull();
    expect(result.continueWatching).toHaveLength(0);
    expect(result.finishSoon).toHaveLength(0);
  });

  it("a show with only a future (unaired) episode produces no candidate", async () => {
    await startWatchingShow(SHOW_E);

    getShowDetails.mockImplementation(async (id: number) => show({ id, seasons: [season(1, 1)] }));
    getSeasonDetails.mockImplementation(async (id: number, seasonNumber: number) =>
      seasonDetails(id, seasonNumber, [episodeFixture(1, 1, "2099-01-01", 5)]),
    );

    const result = await getPersonalHome();
    expect(result.upNext).toBeNull();
  });

  it("one candidate's provider hydration failing doesn't break the rest", async () => {
    await startWatchingShow(SHOW_A);
    await recordEpisodeWatch({
      showProviderId: SHOW_A,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });
    await startWatchingShow(SHOW_D); // will fail to hydrate below

    getShowDetails.mockImplementation(async (id: number) => {
      if (id === SHOW_D) throw new Error("TMDB unavailable");
      return show({ id });
    });
    getSeasonDetails.mockImplementation(async (id: number, seasonNumber: number) =>
      seasonDetails(id, seasonNumber, [
        episodeFixture(1, 1, "2020-01-01", 1),
        episodeFixture(1, 2, "2020-01-08", 2),
      ]),
    );

    const result = await getPersonalHome();
    // SHOW_A (the other, successfully-hydrated candidate) still surfaces.
    expect(result.upNext?.showProviderId).toBe(SHOW_A);
  });
});
