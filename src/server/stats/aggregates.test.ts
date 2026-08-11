import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const {
  getActiveStatsYears,
  getTrackingStateCounts,
  getViewingTimestampsInRange,
  getViewingVolume,
  getYearlyActivityCounts,
} = await import("./aggregates");
const { recordMovieWatch } = await import("@/server/tracking/movie-events");
const { recordEpisodeWatch } = await import("@/server/tracking/episode-events");
const { dropShow, putShowOnHold, startWatchingShow } = await import("@/server/tracking/show-state");

const FIGHT_CLUB = 550;
const DARK_KNIGHT = 155;
const WINTERS_WATCH = 1399;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("getViewingVolume", () => {
  it("returns all zeros for a brand-new user", async () => {
    const volume = await getViewingVolume(userId, null);
    expect(volume).toEqual({
      uniqueMoviesWatched: 0,
      movieWatchEventCount: 0,
      uniqueEpisodesWatched: 0,
      episodeWatchEventCount: 0,
      uniqueShowsWatched: 0,
    });
  });

  it("counts unique movies separately from total viewing events (rewatches)", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordMovieWatch({ movieProviderId: DARK_KNIGHT });

    const volume = await getViewingVolume(userId, null);
    expect(volume.uniqueMoviesWatched).toBe(2);
    expect(volume.movieWatchEventCount).toBe(3);
  });

  it("counts a show as watched only once it has a regular (non-Special) episode", async () => {
    // A single Special watched alone must not count the show as watched.
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 0,
      episodeNumber: 1,
      episodeProviderId: 9001,
    });
    expect((await getViewingVolume(userId, null)).uniqueShowsWatched).toBe(0);

    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });
    expect((await getViewingVolume(userId, null)).uniqueShowsWatched).toBe(1);
  });

  it("never inflates unique episodes watched by rewatches", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });

    const volume = await getViewingVolume(userId, null);
    expect(volume.uniqueEpisodesWatched).toBe(1);
    expect(volume.episodeWatchEventCount).toBe(2);
  });

  it("scopes every count to the given [start, end) range when bounds are provided", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2025-01-01") });
    await recordMovieWatch({ movieProviderId: DARK_KNIGHT, watchedAt: new Date("2026-06-01") });

    const volume = await getViewingVolume(userId, {
      start: new Date(Date.UTC(2026, 0, 1)),
      end: new Date(Date.UTC(2027, 0, 1)),
    });
    expect(volume.uniqueMoviesWatched).toBe(1);
    expect(volume.movieWatchEventCount).toBe(1);
  });
});

describe("getTrackingStateCounts", () => {
  it("returns all zeros with no tracked shows", async () => {
    expect(await getTrackingStateCounts(userId)).toEqual({ watching: 0, onHold: 0, dropped: 0 });
  });

  it("counts each explicit status independently", async () => {
    await startWatchingShow(1);
    await putShowOnHold(2);
    await dropShow(3);
    await dropShow(4);

    expect(await getTrackingStateCounts(userId)).toEqual({ watching: 1, onHold: 1, dropped: 2 });
  });

  it("counts a show once under its current status, not its history of past statuses", async () => {
    await startWatchingShow(1);
    await dropShow(1);

    expect(await getTrackingStateCounts(userId)).toEqual({ watching: 0, onHold: 0, dropped: 1 });
  });
});

describe("getViewingTimestampsInRange", () => {
  it("returns nothing for a user with no history in range", async () => {
    const bounds = { start: new Date(Date.UTC(2026, 0, 1)), end: new Date(Date.UTC(2027, 0, 1)) };
    expect(await getViewingTimestampsInRange(userId, bounds)).toEqual([]);
  });

  it("combines movie and episode timestamps into one list", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });

    const now = new Date();
    const bounds = {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)),
      end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
    };
    expect(await getViewingTimestampsInRange(userId, bounds)).toHaveLength(2);
  });

  it("excludes a viewing event outside the requested bounds", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2020-01-01") });

    const bounds = { start: new Date(Date.UTC(2026, 0, 1)), end: new Date(Date.UTC(2027, 0, 1)) };
    expect(await getViewingTimestampsInRange(userId, bounds)).toEqual([]);
  });
});

describe("getActiveStatsYears", () => {
  it("returns nothing for a brand-new user", async () => {
    expect(await getActiveStatsYears(userId)).toEqual([]);
  });

  it("returns distinct years with real history, newest first", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2024-06-01") });
    await recordMovieWatch({ movieProviderId: DARK_KNIGHT, watchedAt: new Date("2026-01-01") });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
      watchedAt: new Date("2024-08-01"), // same year as an existing movie — not duplicated
    });

    expect(await getActiveStatsYears(userId)).toEqual([2026, 2024]);
  });
});

describe("getYearlyActivityCounts", () => {
  it("groups events by real calendar year across both event tables", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2024-06-01") });
    await recordMovieWatch({ movieProviderId: DARK_KNIGHT, watchedAt: new Date("2024-07-01") });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
      watchedAt: new Date("2026-01-01"),
    });

    const counts = await getYearlyActivityCounts(userId);
    expect(counts).toEqual(
      expect.arrayContaining([
        { year: 2024, eventCount: 2 },
        { year: 2026, eventCount: 1 },
      ]),
    );
  });
});
