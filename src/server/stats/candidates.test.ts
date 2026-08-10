import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { getMovieWatchAggregates, getShowWatchAggregates } = await import("./candidates");
const { recordMovieWatch } = await import("@/server/tracking/movie-events");
const { recordEpisodeWatch } = await import("@/server/tracking/episode-events");

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

describe("getMovieWatchAggregates", () => {
  it("returns nothing for a user with no movie history", async () => {
    expect(await getMovieWatchAggregates(userId)).toEqual([]);
  });

  it("groups by movie, reporting watch count and last watched", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2023-01-01") });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2024-06-01") });
    await recordMovieWatch({ movieProviderId: DARK_KNIGHT });

    const rows = await getMovieWatchAggregates(userId);
    const fightClub = rows.find((r) => r.movieProviderId === FIGHT_CLUB);
    expect(fightClub?.watchCount).toBe(2);
    expect(fightClub?.lastWatchedAt).toEqual(new Date("2024-06-01"));
    expect(rows.find((r) => r.movieProviderId === DARK_KNIGHT)?.watchCount).toBe(1);
  });
});

describe("getShowWatchAggregates", () => {
  it("excludes a show with only a Special watched — not title-level eligible", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 0,
      episodeNumber: 1,
      episodeProviderId: 9001,
    });
    expect(await getShowWatchAggregates(userId)).toEqual([]);
  });

  it("computes unique regular episodes watched and rewatched episode instances", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1001,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 2,
      episodeProviderId: 1002,
    });
    // A rewatch of the same episode.
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 2,
      episodeProviderId: 1002,
    });
    // A rewatched Special still counts toward rewatch behavior, even
    // though it never counts toward `watchedEpisodeCount` eligibility.
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 0,
      episodeNumber: 1,
      episodeProviderId: 9001,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 0,
      episodeNumber: 1,
      episodeProviderId: 9001,
    });

    const [show] = await getShowWatchAggregates(userId);
    expect(show?.showProviderId).toBe(WINTERS_WATCH);
    expect(show?.watchedEpisodeCount).toBe(2);
    expect(show?.rewatchedEpisodeCount).toBe(2);
    // 1001 + 1002×2 + 9001×2 = 5 total events.
    expect(show?.totalEpisodeEvents).toBe(5);
  });
});
