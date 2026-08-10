import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tracking data is private, user-owned data — these tests exist
// specifically to prove one user can never read or mutate another
// user's rows, even when they know (or guess) the exact row/show ID. See
// docs/tracking.md, "Ownership and privacy".
vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { recordMovieWatch, removeMovieWatchEvent, updateMovieWatchedAt, listMovieWatchEvents } =
  await import("./movie-events");
const {
  recordEpisodeWatch,
  unmarkEpisodeWatched,
  removeEpisodeWatchEvent,
  updateEpisodeWatchedAt,
  resetShowWatchHistory,
  listEpisodeWatchEventsForShow,
} = await import("./episode-events");
const { startWatchingShow, putShowOnHold, getShowTrackingState } = await import("./show-state");
const { addToWatchlist, getPlanningState } = await import("@/server/planning/planning-items");

const FIGHT_CLUB = 550;
const WINTERS_WATCH = 1399;

let userA: string;
let userB: string;

function loginAs(userId: string) {
  requireSession.mockResolvedValue({ user: { id: userId } });
}

beforeEach(async () => {
  userA = await createTestUser();
  userB = await createTestUser();
});

afterEach(async () => {
  await deleteTestUser(userA);
  await deleteTestUser(userB);
});

describe("movie watch events", () => {
  it("user A cannot delete user B's movie watch event", async () => {
    loginAs(userB);
    const event = await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    loginAs(userA);
    const result = await removeMovieWatchEvent(event.id);
    expect(result).toBeNull();

    loginAs(userB);
    const remaining = await listMovieWatchEvents(FIGHT_CLUB);
    expect(remaining).toHaveLength(1);
  });

  it("reads only return the current user's events", async () => {
    loginAs(userA);
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    loginAs(userB);
    const events = await listMovieWatchEvents(FIGHT_CLUB);
    expect(events).toHaveLength(0);
  });

  it("user A cannot edit user B's watch date", async () => {
    loginAs(userB);
    const event = await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date("2020-01-01"),
    });

    loginAs(userA);
    const result = await updateMovieWatchedAt(event.id, new Date("2024-01-01"));
    expect(result).toBeNull();

    loginAs(userB);
    const [unchanged] = await listMovieWatchEvents(FIGHT_CLUB);
    expect(unchanged?.watchedAt.toISOString()).toBe(new Date("2020-01-01").toISOString());
  });
});

describe("episode watch events", () => {
  it("user A cannot unmark user B's watched episode", async () => {
    loginAs(userB);
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });

    loginAs(userA);
    await unmarkEpisodeWatched(1);

    loginAs(userB);
    const remaining = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(remaining).toHaveLength(1);
  });

  it("reads only return the current user's episode history", async () => {
    loginAs(userA);
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });

    loginAs(userB);
    const events = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(events).toHaveLength(0);
  });

  it("user A cannot reset user B's watch history", async () => {
    loginAs(userB);
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });

    loginAs(userA);
    await resetShowWatchHistory(WINTERS_WATCH);

    loginAs(userB);
    const remaining = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(remaining).toHaveLength(1);
  });

  it("user A cannot delete user B's specific episode watch event", async () => {
    loginAs(userB);
    const event = await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });

    loginAs(userA);
    const result = await removeEpisodeWatchEvent(event.id);
    expect(result).toBeNull();

    loginAs(userB);
    const remaining = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(remaining).toHaveLength(1);
  });

  it("user A cannot edit user B's episode watch date", async () => {
    loginAs(userB);
    const event = await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
      watchedAt: new Date("2020-01-01"),
    });

    loginAs(userA);
    const result = await updateEpisodeWatchedAt(event.id, new Date("2024-01-01"));
    expect(result).toBeNull();

    loginAs(userB);
    const [unchanged] = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(unchanged?.watchedAt.toISOString()).toBe(new Date("2020-01-01").toISOString());
  });
});

describe("show tracking state", () => {
  it("user A's status change never affects user B's row for the same show", async () => {
    loginAs(userB);
    await startWatchingShow(WINTERS_WATCH);

    loginAs(userA);
    await putShowOnHold(WINTERS_WATCH);

    loginAs(userB);
    const stateB = await getShowTrackingState(WINTERS_WATCH);
    expect(stateB?.status).toBe("watching");
  });

  it("reads only return the current user's explicit state", async () => {
    loginAs(userA);
    expect(await getShowTrackingState(WINTERS_WATCH)).toBeNull();
  });
});

describe("media planning items", () => {
  it("reads only return the current user's planning entry", async () => {
    loginAs(userB);
    await addToWatchlist("movie", FIGHT_CLUB);

    loginAs(userA);
    expect(await getPlanningState("movie", FIGHT_CLUB)).toBeNull();
  });
});
