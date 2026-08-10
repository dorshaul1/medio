import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { getRecentViewingTimestamps, getTrackingStateCounts, getViewingVolume } = await import(
  "./aggregates"
);
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
    const volume = await getViewingVolume(userId);
    expect(volume).toEqual({
      uniqueMoviesWatched: 0,
      movieWatchEventCount: 0,
      uniqueEpisodesWatched: 0,
      episodeWatchEventCount: 0,
      uniqueShowsWatched: 0,
      watchedThisYearCount: 0,
    });
  });

  it("counts unique movies separately from total viewing events (rewatches)", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordMovieWatch({ movieProviderId: DARK_KNIGHT });

    const volume = await getViewingVolume(userId);
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
    expect((await getViewingVolume(userId)).uniqueShowsWatched).toBe(0);

    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });
    expect((await getViewingVolume(userId)).uniqueShowsWatched).toBe(1);
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

    const volume = await getViewingVolume(userId);
    expect(volume.uniqueEpisodesWatched).toBe(1);
    expect(volume.episodeWatchEventCount).toBe(2);
  });

  it("counts events watched this calendar year", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });

    expect((await getViewingVolume(userId)).watchedThisYearCount).toBe(2);
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

describe("getRecentViewingTimestamps", () => {
  it("returns nothing for a user with no recent history", async () => {
    expect(await getRecentViewingTimestamps(userId, 12)).toEqual([]);
  });

  it("combines movie and episode timestamps into one list", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });

    expect(await getRecentViewingTimestamps(userId, 12)).toHaveLength(2);
  });

  it("excludes a viewing event outside the requested window", async () => {
    await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
    });

    expect(await getRecentViewingTimestamps(userId, 1)).toEqual([]);
  });
});
