import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real integration tests against the local dev Postgres (see
// docs/database.md) — same pattern as server/tracking/*.test.ts.
vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { recordMovieWatch, updateMovieWatchedAt } = await import("@/server/tracking/movie-events");
const { recordEpisodeWatch } = await import("@/server/tracking/episode-events");
const { getDiaryActivityCalendar, listDiaryEvents } = await import("./events");

import type { DiaryEvent } from "./types";

const FIGHT_CLUB = 550;
const INCEPTION = 27205;
const WINTERS_WATCH = 1399;

let userId: string;
let otherUserId: string;

beforeEach(async () => {
  userId = await createTestUser();
  otherUserId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
  await deleteTestUser(otherUserId);
});

describe("listDiaryEvents", () => {
  it("returns only movie events when filter is movies", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    const { events } = await listDiaryEvents({
      userId,
      filter: "movies",
      sort: "newest",
      cursor: null,
      limit: 10,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("movie");
  });

  it("returns only episode events when filter is tv", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    const { events } = await listDiaryEvents({
      userId,
      filter: "tv",
      sort: "newest",
      cursor: null,
      limit: 10,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("episode");
  });

  it("interleaves movie and episode events into one correct chronology", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2024-01-01") });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
      watchedAt: new Date("2024-01-02"),
    });
    await recordMovieWatch({ movieProviderId: INCEPTION, watchedAt: new Date("2024-01-03") });

    const { events } = await listDiaryEvents({
      userId,
      filter: "all",
      sort: "newest",
      cursor: null,
      limit: 10,
    });

    expect(events.map((e) => e.eventType)).toEqual(["movie", "episode", "movie"]);
    expect(events[0]?.eventType === "movie" && events[0].movieProviderId).toBe(INCEPTION);
    expect(events[2]?.eventType === "movie" && events[2].movieProviderId).toBe(FIGHT_CLUB);
  });

  it("orders oldest first when sort is oldest", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2024-01-03") });
    await recordMovieWatch({ movieProviderId: INCEPTION, watchedAt: new Date("2024-01-01") });

    const { events } = await listDiaryEvents({
      userId,
      filter: "all",
      sort: "oldest",
      cursor: null,
      limit: 10,
    });

    expect(events[0]?.eventType === "movie" && events[0].movieProviderId).toBe(INCEPTION);
    expect(events[1]?.eventType === "movie" && events[1].movieProviderId).toBe(FIGHT_CLUB);
  });

  it("never returns another user's events", async () => {
    requireSession.mockResolvedValue({ user: { id: otherUserId } });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    const { events } = await listDiaryEvents({
      userId,
      filter: "all",
      sort: "newest",
      cursor: null,
      limit: 10,
    });

    expect(events).toHaveLength(0);
  });

  describe("cursor pagination", () => {
    it("pages through mixed history with no duplicate and no skipped events", async () => {
      const watchedAt = (n: number) => new Date(2024, 0, n);
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: watchedAt(1) });
      await recordEpisodeWatch({
        showProviderId: WINTERS_WATCH,
        seasonNumber: 1,
        episodeNumber: 1,
        episodeProviderId: 63056,
        watchedAt: watchedAt(2),
      });
      await recordMovieWatch({ movieProviderId: INCEPTION, watchedAt: watchedAt(3) });
      await recordEpisodeWatch({
        showProviderId: WINTERS_WATCH,
        seasonNumber: 1,
        episodeNumber: 2,
        episodeProviderId: 63057,
        watchedAt: watchedAt(4),
      });
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: watchedAt(5) });

      const seenIds: string[] = [];
      let cursor: Parameters<typeof listDiaryEvents>[0]["cursor"] = null;
      let pages = 0;
      // Page through 2-at-a-time until exhausted — 5 events, 3 pages.
      while (true) {
        const { events, hasMore } = await listDiaryEvents({
          userId,
          filter: "all",
          sort: "newest",
          cursor,
          limit: 2,
        });
        seenIds.push(...events.map((e) => e.id));
        pages += 1;
        if (!hasMore || events.length === 0) break;
        const last = events[events.length - 1];
        if (!last) break;
        cursor = { watchedAt: last.watchedAt, eventType: last.eventType, id: last.id };
        if (pages > 10) throw new Error("pagination did not terminate");
      }

      expect(seenIds).toHaveLength(5);
      expect(new Set(seenIds).size).toBe(5); // no duplicates
      expect(pages).toBe(3);

      // Full, unpaginated fetch must produce the identical id sequence.
      const { events: full } = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "newest",
        cursor: null,
        limit: 50,
      });
      expect(seenIds).toEqual(full.map((e) => e.id));
    });

    it("never drops, duplicates, or reorders events sharing the exact same watchedAt", async () => {
      const sameInstant = new Date("2024-06-01T12:00:00Z");
      const ids = await Promise.all(
        [1, 2, 3].map((n) =>
          recordMovieWatch({ movieProviderId: 1000 + n, watchedAt: sameInstant }).then((e) => e.id),
        ),
      );

      const seenIds: string[] = [];
      let cursor: Parameters<typeof listDiaryEvents>[0]["cursor"] = null;
      for (let page = 0; page < 5; page++) {
        const { events, hasMore } = await listDiaryEvents({
          userId,
          filter: "all",
          sort: "newest",
          cursor,
          limit: 1,
        });
        if (events.length === 0) break;
        seenIds.push(...events.map((e) => e.id));
        if (!hasMore) break;
        const last = events[events.length - 1];
        if (!last) break;
        cursor = { watchedAt: last.watchedAt, eventType: last.eventType, id: last.id };
      }

      expect(seenIds.sort()).toEqual([...ids].sort());
    });
  });

  describe("rewatch ordinal", () => {
    it("assigns ordinal 1, 2, 3 in chronological order for a movie's own rewatches", async () => {
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-01-01") });
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-05-01") });
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-08-01") });

      const { events } = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "oldest",
        cursor: null,
        limit: 10,
      });

      expect(events.map((e) => e.ordinal)).toEqual([1, 2, 3]);
    });

    it("a backdated event becomes ordinal 1, correctly renumbering the rest", async () => {
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-01-01") });
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-05-01") });
      // Backdated to before both existing events.
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2025-01-01") });

      const { events } = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "oldest",
        cursor: null,
        limit: 10,
      });

      expect(events.map((e) => e.watchedAt.getFullYear())).toEqual([2025, 2026, 2026]);
      expect(events.map((e) => e.ordinal)).toEqual([1, 2, 3]);
    });

    it("editing watchedAt through updateMovieWatchedAt recomputes ordinal correctly", async () => {
      const first = await recordMovieWatch({
        movieProviderId: FIGHT_CLUB,
        watchedAt: new Date("2026-01-01"),
      });
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-05-01") });

      // Move the first event to after the second one.
      await updateMovieWatchedAt(first.id, new Date("2026-08-01"));

      const { events } = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "oldest",
        cursor: null,
        limit: 10,
      });

      expect(events.map((e) => e.id)).toEqual([events[0]?.id, events[1]?.id]);
      const moved = events.find((e) => e.id === first.id);
      expect(moved?.ordinal).toBe(2);
    });

    it("ordinal is correct on a later page — not reset by pagination", async () => {
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-01-01") });
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-02-01") });
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: new Date("2026-03-01") });

      // First page (newest first, limit 1) sees only the 3rd viewing.
      const page1 = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "newest",
        cursor: null,
        limit: 1,
      });
      expect(page1.events[0]?.ordinal).toBe(3);

      const last = page1.events[0];
      if (!last) throw new Error("expected an event");
      const page2 = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "newest",
        cursor: { watchedAt: last.watchedAt, eventType: last.eventType, id: last.id },
        limit: 1,
      });
      // The 2nd viewing, on page 2, still correctly reports ordinal 2 —
      // not recomputed relative to only this page's contents.
      expect(page2.events[0]?.ordinal).toBe(2);
    });

    it("episode ordinal partitions by episode identity, independent of other episodes", async () => {
      await recordEpisodeWatch({
        showProviderId: WINTERS_WATCH,
        seasonNumber: 1,
        episodeNumber: 1,
        episodeProviderId: 63056,
        watchedAt: new Date("2026-01-01"),
      });
      await recordEpisodeWatch({
        showProviderId: WINTERS_WATCH,
        seasonNumber: 1,
        episodeNumber: 1,
        episodeProviderId: 63056,
        watchedAt: new Date("2026-02-01"),
      }); // a rewatch of the same episode
      await recordEpisodeWatch({
        showProviderId: WINTERS_WATCH,
        seasonNumber: 1,
        episodeNumber: 2,
        episodeProviderId: 63057,
        watchedAt: new Date("2026-01-15"),
      }); // a different episode, watched once — must stay ordinal 1

      const { events } = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "oldest",
        cursor: null,
        limit: 10,
      });

      const byEpisode = new Map(
        events
          .filter(
            (e): e is Extract<DiaryEvent, { eventType: "episode" }> => e.eventType === "episode",
          )
          .map((e) => [`${e.episodeProviderId}:${e.watchedAt.toISOString()}`, e.ordinal]),
      );
      expect(byEpisode.get("63056:2026-01-01T00:00:00.000Z")).toBe(1);
      expect(byEpisode.get("63057:2026-01-15T00:00:00.000Z")).toBe(1);
      expect(byEpisode.get("63056:2026-02-01T00:00:00.000Z")).toBe(2);
    });
  });

  describe("month-scoped querying (period)", () => {
    it("only returns events within the requested UTC calendar month", async () => {
      await recordMovieWatch({
        movieProviderId: FIGHT_CLUB,
        watchedAt: new Date(Date.UTC(2026, 6, 31, 23, 0)), // July 31
      });
      await recordMovieWatch({
        movieProviderId: INCEPTION,
        watchedAt: new Date(Date.UTC(2026, 7, 15, 12, 0)), // August 15
      });
      await recordEpisodeWatch({
        showProviderId: WINTERS_WATCH,
        seasonNumber: 1,
        episodeNumber: 1,
        episodeProviderId: 63056,
        watchedAt: new Date(Date.UTC(2026, 8, 1, 0, 0)), // September 1
      });

      const { events } = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "newest",
        cursor: null,
        limit: 10,
        period: { year: 2026, month: 8 },
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType === "movie" && events[0].movieProviderId).toBe(INCEPTION);
    });

    it("keeps a rewatch's ordinal reflecting the entire history, not just the requested month", async () => {
      await recordMovieWatch({
        movieProviderId: FIGHT_CLUB,
        watchedAt: new Date(Date.UTC(2026, 0, 1)),
      });
      await recordMovieWatch({
        movieProviderId: FIGHT_CLUB,
        watchedAt: new Date(Date.UTC(2026, 7, 10)), // August — the requested month
      });

      const { events } = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "newest",
        cursor: null,
        limit: 10,
        period: { year: 2026, month: 8 },
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.ordinal).toBe(2);
    });

    it("still pages correctly within a bounded month", async () => {
      const watchedAt = (day: number) => new Date(Date.UTC(2026, 7, day, 12, 0));
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: watchedAt(1) });
      await recordMovieWatch({ movieProviderId: INCEPTION, watchedAt: watchedAt(2) });
      await recordMovieWatch({ movieProviderId: FIGHT_CLUB, watchedAt: watchedAt(3) });
      // Outside the requested month — must never appear in any page.
      await recordMovieWatch({
        movieProviderId: FIGHT_CLUB,
        watchedAt: new Date(Date.UTC(2026, 8, 1)),
      });

      const page1 = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "oldest",
        cursor: null,
        limit: 2,
        period: { year: 2026, month: 8 },
      });
      expect(page1.events).toHaveLength(2);
      expect(page1.hasMore).toBe(true);

      const last = page1.events[page1.events.length - 1];
      if (!last) throw new Error("expected an event");
      const page2 = await listDiaryEvents({
        userId,
        filter: "all",
        sort: "oldest",
        cursor: { watchedAt: last.watchedAt, eventType: last.eventType, id: last.id },
        limit: 2,
        period: { year: 2026, month: 8 },
      });
      expect(page2.events).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });
  });
});

describe("getDiaryActivityCalendar", () => {
  it("aggregates real movie/episode counts per (year, month) bucket", async () => {
    await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date(Date.UTC(2026, 7, 5)),
    });
    await recordMovieWatch({
      movieProviderId: INCEPTION,
      watchedAt: new Date(Date.UTC(2026, 7, 20)),
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
      watchedAt: new Date(Date.UTC(2026, 7, 10)),
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 2,
      episodeProviderId: 63057,
      watchedAt: new Date(Date.UTC(2025, 0, 1)),
    });

    const calendar = await getDiaryActivityCalendar(userId);

    const august2026 = calendar.find((bucket) => bucket.year === 2026 && bucket.month === 8);
    expect(august2026).toEqual({ year: 2026, month: 8, movieCount: 2, episodeCount: 1 });

    const january2025 = calendar.find((bucket) => bucket.year === 2025 && bucket.month === 1);
    expect(january2025).toEqual({ year: 2025, month: 1, movieCount: 0, episodeCount: 1 });
  });

  it("never returns another user's activity", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    const calendar = await getDiaryActivityCalendar(otherUserId);
    expect(calendar).toEqual([]);
  });

  it("returns an empty list for a user with no history", async () => {
    const calendar = await getDiaryActivityCalendar(userId);
    expect(calendar).toEqual([]);
  });
});
