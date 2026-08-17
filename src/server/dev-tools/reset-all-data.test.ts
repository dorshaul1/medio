import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
const getCurrentSession = vi.fn();
vi.mock("@/server/auth/session", () => ({
  requireSession: () => requireSession(),
  getCurrentSession: () => getCurrentSession(),
}));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { resetAllUserData } = await import("./reset-all-data");
const { recordMovieWatch, getMovieWatchSummary } = await import("@/server/tracking/movie-events");
const { recordEpisodeWatch } = await import("@/server/tracking/episode-events");
const { startWatchingShow, getShowTrackingState } = await import("@/server/tracking/show-state");
const { setMediaComment, getMediaComment } = await import("@/server/opinions/comments");
const { addToWatchlist, getPlanningState } = await import("@/server/planning/planning-items");
const { updatePreferences } = await import("@/server/preferences/mutations");
const { fetchUserPreferences } = await import("@/server/preferences/queries");

let userId: string;
beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
  getCurrentSession.mockResolvedValue({ user: { id: userId } });
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(async () => {
  await deleteTestUser(userId);
  vi.unstubAllEnvs();
});

describe("resetAllUserData", () => {
  it("throws in production, never touching the database", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await recordMovieWatch({ movieProviderId: 550 });

    await expect(resetAllUserData()).rejects.toThrow();
    expect((await getMovieWatchSummary(550)).hasWatched).toBe(true);
  });

  it("wipes every table this user owns, except the account itself", async () => {
    await recordMovieWatch({ movieProviderId: 550 });
    await recordEpisodeWatch({
      showProviderId: 1399,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });
    await startWatchingShow(1399);
    await setMediaComment({ mediaType: "movie", mediaProviderId: 550, content: "Great movie." });
    await addToWatchlist("movie", 155);
    await updatePreferences({ theme: "dark" });

    await resetAllUserData();

    expect((await getMovieWatchSummary(550)).hasWatched).toBe(false);
    expect(await getShowTrackingState(1399)).toBeNull();
    expect(await getMediaComment({ mediaType: "movie", mediaProviderId: 550 })).toBeNull();
    expect(await getPlanningState("movie", 155)).toBeNull();
    expect((await fetchUserPreferences()).theme).toBe("system");
  });

  it("never affects another user's data", async () => {
    const otherUserId = await createTestUser();
    try {
      requireSession.mockResolvedValue({ user: { id: otherUserId } });
      await recordMovieWatch({ movieProviderId: 550 });

      requireSession.mockResolvedValue({ user: { id: userId } });
      await resetAllUserData();

      getCurrentSession.mockResolvedValue({ user: { id: otherUserId } });
      requireSession.mockResolvedValue({ user: { id: otherUserId } });
      expect((await getMovieWatchSummary(550)).hasWatched).toBe(true);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});
