import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const {
  recordEpisodeWatch,
  unmarkEpisodeWatched,
  removeEpisodeWatchEvent,
  updateEpisodeWatchedAt,
  resetShowWatchHistory,
  listEpisodeWatchEventsForShow,
  getEpisodeWatchSummary,
  getSeasonEpisodeWatchSummaries,
  markSeasonWatched,
  markShowWatched,
  unmarkSeasonWatched,
} = await import("./episode-events");
const { getShowTrackingState, putShowOnHold, dropShow } = await import("./show-state");

const WINTERS_WATCH = 1399;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("recordEpisodeWatch", () => {
  it("records a viewing and returns the created event", async () => {
    const event = await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    expect(event.showProviderId).toBe(WINTERS_WATCH);
    expect(event.seasonNumber).toBe(1);
    expect(event.episodeNumber).toBe(1);
  });

  it("a rewatch creates a second event, not an overwrite", async () => {
    const input = {
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    };
    await recordEpisodeWatch(input);
    await recordEpisodeWatch(input);

    const events = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(events).toHaveLength(2);
  });

  it("ensures the show's tracking state exists and is watching", async () => {
    expect(await getShowTrackingState(WINTERS_WATCH)).toBeNull();

    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    const state = await getShowTrackingState(WINTERS_WATCH);
    expect(state?.status).toBe("watching");
  });

  it("resumes an On Hold show back to watching", async () => {
    await putShowOnHold(WINTERS_WATCH);
    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("on_hold");

    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 2,
      episodeProviderId: 63057,
    });

    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });

  it("resumes a Dropped show back to watching", async () => {
    await dropShow(WINTERS_WATCH);
    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("dropped");

    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 3,
      episodeProviderId: 63058,
    });

    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });
});

describe("unmarkEpisodeWatched", () => {
  it("removes the episode's watch event, back to fully unwatched", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await unmarkEpisodeWatched(63056);

    const summary = await getEpisodeWatchSummary(63056);
    expect(summary).toEqual({ hasWatched: false, watchCount: 0, lastWatchedAt: null });
  });

  it("removes every event for that episode, not just the most recent one", async () => {
    const input = {
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    };
    await recordEpisodeWatch(input);
    await recordEpisodeWatch(input);

    await unmarkEpisodeWatched(63056);

    const remaining = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(remaining).toHaveLength(0);
  });

  it("does not clear the show's explicit tracking state", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await unmarkEpisodeWatched(63056);

    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });
});

describe("removeEpisodeWatchEvent", () => {
  it("removes exactly the one event, preserving the others", async () => {
    const input = {
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    };
    const first = await recordEpisodeWatch({ ...input, watchedAt: new Date("2020-01-01") });
    await recordEpisodeWatch({ ...input, watchedAt: new Date("2021-01-01") });

    await removeEpisodeWatchEvent(first.id);

    const remaining = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(remaining).toHaveLength(1);
    expect(remaining.find((e) => e.id === first.id)).toBeUndefined();
  });

  it("the episode remains watched when a rewatch event still remains", async () => {
    const input = {
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    };
    await recordEpisodeWatch(input);
    const second = await recordEpisodeWatch(input);

    await removeEpisodeWatchEvent(second.id);

    const summary = await getEpisodeWatchSummary(63056);
    expect(summary.hasWatched).toBe(true);
    expect(summary.watchCount).toBe(1);
  });

  it("deleting the final event returns the episode to unwatched", async () => {
    const event = await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await removeEpisodeWatchEvent(event.id);

    const summary = await getEpisodeWatchSummary(63056);
    expect(summary).toEqual({ hasWatched: false, watchCount: 0, lastWatchedAt: null });
  });

  it("does not clear the show's explicit tracking state", async () => {
    const event = await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await removeEpisodeWatchEvent(event.id);

    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });

  it("returns null for an event that doesn't exist", async () => {
    const result = await removeEpisodeWatchEvent(crypto.randomUUID());
    expect(result).toBeNull();
  });
});

describe("updateEpisodeWatchedAt", () => {
  it("corrects the watchedAt of exactly the one event", async () => {
    const event = await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
      watchedAt: new Date("2020-01-01"),
    });
    const corrected = new Date("2020-06-15");

    const updated = await updateEpisodeWatchedAt(event.id, corrected);

    expect(updated?.watchedAt.toISOString()).toBe(corrected.toISOString());
    expect(updated?.id).toBe(event.id);
  });

  it("never changes which episode the event belongs to", async () => {
    const event = await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await updateEpisodeWatchedAt(event.id, new Date("2020-01-01"));

    const events = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(events).toHaveLength(1);
    expect(events[0]?.episodeProviderId).toBe(63056);
    expect(events[0]?.seasonNumber).toBe(1);
    expect(events[0]?.episodeNumber).toBe(1);
  });

  it("returns null for an event that doesn't exist", async () => {
    const result = await updateEpisodeWatchedAt(crypto.randomUUID(), new Date());
    expect(result).toBeNull();
  });
});

describe("listEpisodeWatchEventsForShow", () => {
  it("narrows to one season when seasonNumber is provided", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 2,
      episodeNumber: 1,
      episodeProviderId: 2,
    });

    const seasonOne = await listEpisodeWatchEventsForShow({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
    });
    expect(seasonOne).toHaveLength(1);
    expect(seasonOne[0]?.seasonNumber).toBe(1);
  });
});

describe("getEpisodeWatchSummary", () => {
  it("reports unwatched for an episode with no events", async () => {
    const summary = await getEpisodeWatchSummary(999999);
    expect(summary).toEqual({ hasWatched: false, watchCount: 0, lastWatchedAt: null });
  });

  it("counts rewatches for one episode", async () => {
    const input = {
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    };
    await recordEpisodeWatch(input);
    await recordEpisodeWatch(input);

    const summary = await getEpisodeWatchSummary(63056);
    expect(summary.watchCount).toBe(2);
  });
});

describe("getSeasonEpisodeWatchSummaries", () => {
  it("summarizes every watched episode in a season from one bulk fetch, omitting unwatched ones", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 2,
      episodeProviderId: 63057,
    });

    const summaries = await getSeasonEpisodeWatchSummaries({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
    });

    expect(summaries.get(1)?.watchCount).toBe(2);
    expect(summaries.get(2)?.watchCount).toBe(1);
    expect(summaries.get(3)).toBeUndefined();
  });
});

describe("resetShowWatchHistory", () => {
  it("deletes every watch event for the show, across seasons and rewatches", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    }); // a rewatch — still just one episode's worth of real events
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 2,
      episodeNumber: 1,
      episodeProviderId: 63058,
    });

    await resetShowWatchHistory(WINTERS_WATCH);

    const remaining = await listEpisodeWatchEventsForShow({ showProviderId: WINTERS_WATCH });
    expect(remaining).toHaveLength(0);
  });

  it("does not clear the show's explicit tracking state", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await resetShowWatchHistory(WINTERS_WATCH);

    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });
});

describe("markSeasonWatched", () => {
  it("marks every given episode watched in one call", async () => {
    await markSeasonWatched({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodes: [
        { episodeNumber: 1, episodeProviderId: 63056 },
        { episodeNumber: 2, episodeProviderId: 63057 },
      ],
    });

    const summaries = await getSeasonEpisodeWatchSummaries({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
    });
    expect(summaries.get(1)?.hasWatched).toBe(true);
    expect(summaries.get(2)?.hasWatched).toBe(true);
  });

  it("skips episodes already watched instead of creating a rewatch event", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await markSeasonWatched({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodes: [
        { episodeNumber: 1, episodeProviderId: 63056 },
        { episodeNumber: 2, episodeProviderId: 63057 },
      ],
    });

    const events = await listEpisodeWatchEventsForShow({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
    });
    expect(events).toHaveLength(2);
  });

  it("ensures the show's tracking state is watching", async () => {
    await markSeasonWatched({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodes: [{ episodeNumber: 1, episodeProviderId: 63056 }],
    });

    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });

  it("is a no-op for an empty episode list", async () => {
    await markSeasonWatched({ showProviderId: WINTERS_WATCH, seasonNumber: 1, episodes: [] });

    expect(await getShowTrackingState(WINTERS_WATCH)).toBeNull();
  });

  it("only marks the given season, leaving other seasons untouched", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 2,
      episodeNumber: 1,
      episodeProviderId: 63058,
    });

    await markSeasonWatched({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodes: [{ episodeNumber: 1, episodeProviderId: 63056 }],
    });

    const seasonTwoEvents = await listEpisodeWatchEventsForShow({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 2,
    });
    expect(seasonTwoEvents).toHaveLength(1);
  });
});

describe("markShowWatched", () => {
  it("marks episodes across multiple seasons in one call", async () => {
    await markShowWatched({
      showProviderId: WINTERS_WATCH,
      episodes: [
        { seasonNumber: 1, episodeNumber: 1, episodeProviderId: 63056 },
        { seasonNumber: 2, episodeNumber: 1, episodeProviderId: 63058 },
      ],
    });

    const seasonOne = await getSeasonEpisodeWatchSummaries({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
    });
    const seasonTwo = await getSeasonEpisodeWatchSummaries({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 2,
    });
    expect(seasonOne.get(1)?.hasWatched).toBe(true);
    expect(seasonTwo.get(1)?.hasWatched).toBe(true);
  });

  it("skips episodes already watched instead of creating a rewatch event", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await markShowWatched({
      showProviderId: WINTERS_WATCH,
      episodes: [
        { seasonNumber: 1, episodeNumber: 1, episodeProviderId: 63056 },
        { seasonNumber: 1, episodeNumber: 2, episodeProviderId: 63057 },
      ],
    });

    const events = await listEpisodeWatchEventsForShow({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
    });
    expect(events).toHaveLength(2);
  });

  it("ensures the show's tracking state is watching", async () => {
    await markShowWatched({
      showProviderId: WINTERS_WATCH,
      episodes: [{ seasonNumber: 1, episodeNumber: 1, episodeProviderId: 63056 }],
    });

    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });

  it("is a no-op for an empty episode list", async () => {
    await markShowWatched({ showProviderId: WINTERS_WATCH, episodes: [] });
    expect(await getShowTrackingState(WINTERS_WATCH)).toBeNull();
  });
});

describe("unmarkSeasonWatched", () => {
  it("deletes every watch event in the given season only", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 2,
      episodeNumber: 1,
      episodeProviderId: 63058,
    });

    await unmarkSeasonWatched({ showProviderId: WINTERS_WATCH, seasonNumber: 1 });

    const seasonOne = await listEpisodeWatchEventsForShow({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
    });
    const seasonTwo = await listEpisodeWatchEventsForShow({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 2,
    });
    expect(seasonOne).toHaveLength(0);
    expect(seasonTwo).toHaveLength(1);
  });

  it("does not clear the show's explicit tracking state", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });

    await unmarkSeasonWatched({ showProviderId: WINTERS_WATCH, seasonNumber: 1 });

    expect((await getShowTrackingState(WINTERS_WATCH))?.status).toBe("watching");
  });
});
