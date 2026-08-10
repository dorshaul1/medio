import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real integration tests against the local dev Postgres (see
// docs/database.md) — `db` is `server-only`, mocked the same way other
// server-only modules are in this repo's tests. `requireSession` is
// mocked so each test controls exactly which user is "logged in"
// without a real Better Auth session/cookie.
vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const {
  recordMovieWatch,
  removeMovieWatchEvent,
  updateMovieWatchedAt,
  listMovieWatchEvents,
  getMovieWatchSummary,
  getWatchedMovieIds,
} = await import("./movie-events");

const FIGHT_CLUB = 550;
const INCEPTION = 27205;
const THE_PRESTIGE = 1124;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("recordMovieWatch", () => {
  it("records a viewing and returns the created event", async () => {
    const event = await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    expect(event.movieProviderId).toBe(FIGHT_CLUB);
    expect(event.id).toBeTruthy();
    expect(event.watchedAt).toBeInstanceOf(Date);
  });

  it("defaults watchedAt to now, but accepts a backdated timestamp", async () => {
    const backdated = new Date("2020-01-01T00:00:00Z");
    const event = await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: backdated });

    expect(event.watchedAt.toISOString()).toBe(backdated.toISOString());
  });

  it("a second watch creates a second event — a rewatch, not an overwrite", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    const events = await listMovieWatchEvents(FIGHT_CLUB);
    expect(events).toHaveLength(2);
  });

  it("watching the same movie three times across different dates all persist as distinct events", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2020-01-01") });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2022-06-15") });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2024-12-25") });

    const summary = await getMovieWatchSummary(FIGHT_CLUB);
    expect(summary.watchCount).toBe(3);
    expect(summary.lastWatchedAt?.toISOString()).toBe(new Date("2024-12-25").toISOString());
  });
});

describe("getMovieWatchSummary", () => {
  it("reports unwatched for a movie with no events", async () => {
    const summary = await getMovieWatchSummary(FIGHT_CLUB);
    expect(summary).toEqual({ hasWatched: false, watchCount: 0, lastWatchedAt: null });
  });

  it("reports watched with a count and last-watched date after recording", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    const summary = await getMovieWatchSummary(FIGHT_CLUB);

    expect(summary.hasWatched).toBe(true);
    expect(summary.watchCount).toBe(1);
    expect(summary.lastWatchedAt).toBeInstanceOf(Date);
  });
});

describe("removeMovieWatchEvent", () => {
  it("removes exactly the one event, preserving the others", async () => {
    const first = await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date("2020-01-01"),
    });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2021-01-01") });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2022-01-01") });

    await removeMovieWatchEvent(first.id);

    const remaining = await listMovieWatchEvents(FIGHT_CLUB);
    expect(remaining).toHaveLength(2);
    expect(remaining.find((e) => e.id === first.id)).toBeUndefined();
  });

  it("returns null for an event that doesn't exist", async () => {
    const result = await removeMovieWatchEvent(crypto.randomUUID());
    expect(result).toBeNull();
  });
});

describe("updateMovieWatchedAt", () => {
  it("corrects the watchedAt of exactly the one event", async () => {
    const event = await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date("2020-01-01"),
    });
    const corrected = new Date("2020-06-15");

    const updated = await updateMovieWatchedAt(event.id, corrected);

    expect(updated?.watchedAt.toISOString()).toBe(corrected.toISOString());
    expect(updated?.id).toBe(event.id);
  });

  it("never changes which movie the event belongs to", async () => {
    const event = await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    await updateMovieWatchedAt(event.id, new Date("2020-01-01"));

    const updated = await listMovieWatchEvents(FIGHT_CLUB);
    expect(updated).toHaveLength(1);
    expect(updated[0]?.movieProviderId).toBe(FIGHT_CLUB);
  });

  it("returns null for an event that doesn't exist", async () => {
    const result = await updateMovieWatchedAt(crypto.randomUUID(), new Date());
    expect(result).toBeNull();
  });
});

describe("getWatchedMovieIds", () => {
  it("returns only the ids among the given set that this user has watched", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordMovieWatch({ movieProviderId: INCEPTION });

    const watched = await getWatchedMovieIds([FIGHT_CLUB, INCEPTION, THE_PRESTIGE]);

    expect(watched.has(FIGHT_CLUB)).toBe(true);
    expect(watched.has(INCEPTION)).toBe(true);
    expect(watched.has(THE_PRESTIGE)).toBe(false);
  });

  it("returns an empty set for an empty input without querying", async () => {
    const watched = await getWatchedMovieIds([]);
    expect(watched.size).toBe(0);
  });

  it("never returns an id outside the requested set, even if watched", async () => {
    await recordMovieWatch({ movieProviderId: THE_PRESTIGE });
    const watched = await getWatchedMovieIds([FIGHT_CLUB]);
    expect(watched.has(THE_PRESTIGE)).toBe(false);
  });

  it("isolates by user — another user's watch history never leaks in", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    const otherUserId = await createTestUser();
    requireSession.mockResolvedValue({ user: { id: otherUserId } });
    const watchedForOtherUser = await getWatchedMovieIds([FIGHT_CLUB]);
    await deleteTestUser(otherUserId);

    expect(watchedForOtherUser.has(FIGHT_CLUB)).toBe(false);
  });
});
