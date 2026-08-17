import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const getSeasonDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getSeasonDetails: (...args: unknown[]) => getSeasonDetails(...args),
}));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { seedMockData } = await import("./mock-data");
const { getMovieWatchSummary } = await import("@/server/tracking/movie-events");
const { getMediaComment } = await import("@/server/opinions/comments");
const { getPlanningState } = await import("@/server/planning/planning-items");

function season(episodeCount: number) {
  return {
    showId: 0,
    id: 0,
    seasonNumber: 1,
    title: "Season 1",
    overview: null,
    airDate: null,
    poster: null,
    episodes: Array.from({ length: episodeCount }, (_, index) => ({
      id: 9000 + index,
      episodeNumber: index + 1,
      seasonNumber: 1,
      title: `Episode ${index + 1}`,
      overview: null,
      runtimeMinutes: null,
      airDate: "2020-01-01",
      still: null,
      providerRating: 0,
    })),
  };
}

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
  getSeasonDetails.mockResolvedValue(season(10));
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(async () => {
  await deleteTestUser(userId);
  vi.unstubAllEnvs();
});

describe("seedMockData", () => {
  it("throws in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(seedMockData()).rejects.toThrow();
  });

  it("creates real movie watch events and comments through the real domain functions", async () => {
    const result = await seedMockData();

    expect(result.movieEventsCreated).toBeGreaterThan(0);
    expect((await getMovieWatchSummary(550)).hasWatched).toBe(true); // Fight Club
    expect(
      (await getMediaComment({ mediaType: "movie", mediaProviderId: 550 }))?.content,
    ).toBeTruthy();
  });

  it("records a rewatch for the one movie marked as rewatched", async () => {
    const result = await seedMockData();
    // Fight Club (550) and The Shawshank Redemption (278) are both
    // watched more than once.
    expect(result.movieEventsCreated).toBeGreaterThanOrEqual(10 + 2); // base watches + 2 extra rewatch events
  });

  it("seeds episode history using real per-episode ids from the (mocked) season fetch", async () => {
    const result = await seedMockData();

    expect(getSeasonDetails).toHaveBeenCalledWith(1396, 1); // Breaking Bad
    expect(result.episodeEventsCreated).toBeGreaterThan(0);
    expect(result.showsSeeded).toBe(3);
    expect(result.showsFailed).toEqual([]);
  });

  it("degrades gracefully when a show's season fetch fails, without blocking movies/planning", async () => {
    getSeasonDetails.mockRejectedValue(new Error("TMDB unavailable"));

    const result = await seedMockData();

    expect(result.showsFailed.length).toBeGreaterThan(0);
    expect(result.movieEventsCreated).toBeGreaterThan(0);
    expect(result.planningItemsCreated).toBeGreaterThan(0);
  });

  it("seeds Watchlist and Backlog planning entries", async () => {
    await seedMockData();

    expect((await getPlanningState("movie", 244786))?.intent).toBe("watchlist"); // Whiplash
    expect((await getPlanningState("movie", 496243))?.intent).toBe("backlog"); // Parasite
  });
});
