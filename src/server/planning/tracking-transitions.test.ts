import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Proves the one integration point between Planning and Tracking (see
// docs/library.md, "Planning clears when tracking starts"): planning
// intent clears automatically the moment media actually starts being
// consumed, without ever touching the watch history/tracking state that
// caused it to clear.
vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { addToWatchlist, addToBacklog, getPlanningState } = await import("./planning-items");
const { recordMovieWatch } = await import("@/server/tracking/movie-events");
const { recordEpisodeWatch } = await import("@/server/tracking/episode-events");
const { startWatchingShow, getShowTrackingState } = await import("@/server/tracking/show-state");

const FIGHT_CLUB = 550;
const WINTERS_WATCH = 1399;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("movie: Watchlist -> first watch", () => {
  it("clears the planning entry once the movie is actually watched", async () => {
    await addToWatchlist("movie", FIGHT_CLUB);
    expect(await getPlanningState("movie", FIGHT_CLUB)).not.toBeNull();

    const event = await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    expect(await getPlanningState("movie", FIGHT_CLUB)).toBeNull();
    // The watch event itself is real, unaffected history.
    expect(event.movieProviderId).toBe(FIGHT_CLUB);
  });

  it("a movie with no planning entry is unaffected (no-op clear)", async () => {
    await expect(recordMovieWatch({ movieProviderId: FIGHT_CLUB })).resolves.toBeTruthy();
    expect(await getPlanningState("movie", FIGHT_CLUB)).toBeNull();
  });
});

describe("show: Backlog -> Start Watching", () => {
  it("clears the planning entry once the user explicitly starts watching", async () => {
    await addToBacklog("show", WINTERS_WATCH);
    expect(await getPlanningState("show", WINTERS_WATCH)).not.toBeNull();

    await startWatchingShow(WINTERS_WATCH);

    expect(await getPlanningState("show", WINTERS_WATCH)).toBeNull();
    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });
});

describe("show: Watchlist -> first episode watch", () => {
  it("clears the planning entry once the first episode is recorded, with tracking/history intact", async () => {
    await addToWatchlist("show", WINTERS_WATCH);

    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    expect(await getPlanningState("show", WINTERS_WATCH)).toBeNull();
    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });
});

describe("planning removal never touches tracking history", () => {
  it("removing a planning item (via a later re-add + change) does not affect an unrelated watch event", async () => {
    // A movie can be watched, then later re-saved to a list for a
    // rewatch-planning-style use — removing that fresh planning entry
    // must never touch the original watch history.
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await addToWatchlist("movie", FIGHT_CLUB);

    const { removePlanningItem } = await import("./planning-items");
    await removePlanningItem("movie", FIGHT_CLUB);

    const { getMovieWatchSummary } = await import("@/server/tracking/movie-events");
    const summary = await getMovieWatchSummary(FIGHT_CLUB);
    expect(summary.hasWatched).toBe(true);
  });
});
