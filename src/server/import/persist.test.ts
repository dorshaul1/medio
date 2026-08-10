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
const { persistImportPlan } = await import("./persist");
const { rollbackImportBatch, listImportBatches } = await import("./batches");
const { getMovieWatchSummary } = await import("@/server/tracking/movie-events");
const { changePlanningIntent, getPlanningState } = await import("@/server/planning/planning-items");
const { updateMovieWatchedAt } = await import("@/server/tracking/movie-events");
const { listMovieWatchEvents } = await import("@/server/tracking/movie-events");

const FIGHT_CLUB = 550;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
  getSeasonDetails.mockReset();
});

afterEach(async () => {
  await deleteTestUser(userId);
});

function readyPlan(records: Parameters<typeof persistImportPlan>[0]["plan"]["entries"]) {
  return {
    entries: records,
    summary: {
      total: records.length,
      ready: records.length,
      duplicates: 0,
      conflicts: 0,
      needsReview: 0,
      notFound: 0,
      lookupFailed: 0,
      readyByKind: {
        movieWatch: records.filter((r) => r.record.kind === "movieWatch").length,
        episodeWatch: records.filter((r) => r.record.kind === "episodeWatch").length,
        planningItem: records.filter((r) => r.record.kind === "planningItem").length,
        showTrackingState: 0,
        rating: 0,
        note: 0,
      },
    },
  };
}

const RESOLVED_MOVIE = {
  status: "resolved" as const,
  mediaType: "movie" as const,
  providerId: FIGHT_CLUB,
  title: "Fight Club",
  year: 1999,
  poster: null,
};

describe("persistImportPlan", () => {
  it("creates a movie watch event attributed to a new import batch", async () => {
    const plan = readyPlan([
      {
        record: {
          kind: "movieWatch" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "movie" as const,
            title: "Fight Club",
            year: 1999,
          },
          watchedAt: new Date("2026-08-01T12:00:00Z"),
          datePrecision: "dateOnly" as const,
        },
        resolved: RESOLVED_MOVIE,
        status: "ready" as const,
        reason: null,
      },
    ]);

    const result = await persistImportPlan({
      plan,
      source: "letterboxd",
      sourceFilename: "diary.csv",
    });
    expect(result.created.movieWatch).toBe(1);
    expect(result.failed).toEqual([]);

    const summary = await getMovieWatchSummary(FIGHT_CLUB);
    expect(summary.hasWatched).toBe(true);
    expect(summary.watchCount).toBe(1);

    const batches = await listImportBatches();
    expect(batches).toHaveLength(1);
    expect(batches[0]?.source).toBe("letterboxd");
    expect(batches[0]?.sourceFilename).toBe("diary.csv");
    expect(batches[0]?.status).toBe("completed");
  });

  it("reports a per-record failure without losing the rest of the batch", async () => {
    getSeasonDetails.mockRejectedValue(new Error("boom"));
    const plan = readyPlan([
      {
        record: {
          kind: "movieWatch" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "movie" as const,
            title: "Fight Club",
            year: 1999,
          },
          watchedAt: new Date("2026-08-01T12:00:00Z"),
          datePrecision: "dateOnly" as const,
        },
        resolved: RESOLVED_MOVIE,
        status: "ready" as const,
        reason: null,
      },
      {
        record: {
          kind: "episodeWatch" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "show" as const,
            title: "Broken Show",
            year: null,
          },
          seasonNumber: 1,
          episodeNumber: 1,
          episodeProviderId: null,
          watchedAt: new Date("2026-08-01T12:00:00Z"),
          datePrecision: "dateOnly" as const,
        },
        resolved: { ...RESOLVED_MOVIE, mediaType: "show" as const, providerId: 9999 },
        status: "ready" as const,
        reason: null,
      },
    ]);

    const result = await persistImportPlan({ plan, source: "csv", sourceFilename: "history.csv" });
    expect(result.created.movieWatch).toBe(1);
    expect(result.created.episodeWatch).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.kind).toBe("episodeWatch");
  });
});

describe("rollbackImportBatch", () => {
  it("removes exactly the watch event this batch created, and it alone", async () => {
    const plan = readyPlan([
      {
        record: {
          kind: "movieWatch" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "movie" as const,
            title: "Fight Club",
            year: 1999,
          },
          watchedAt: new Date("2026-08-01T12:00:00Z"),
          datePrecision: "dateOnly" as const,
        },
        resolved: RESOLVED_MOVIE,
        status: "ready" as const,
        reason: null,
      },
    ]);
    const result = await persistImportPlan({ plan, source: "letterboxd", sourceFilename: null });

    const rollback = await rollbackImportBatch(result.batchId);
    expect(rollback.removed.movieWatch).toBe(1);

    const summary = await getMovieWatchSummary(FIGHT_CLUB);
    expect(summary.hasWatched).toBe(false);

    const batches = await listImportBatches();
    expect(batches[0]?.status).toBe("rolled_back");
  });

  it("preserves a native watch event created independently of the import", async () => {
    const { recordMovieWatch } = await import("@/server/tracking/movie-events");
    await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date("2026-01-01T12:00:00Z"),
    });

    const plan = readyPlan([
      {
        record: {
          kind: "movieWatch" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "movie" as const,
            title: "Fight Club",
            year: 1999,
          },
          watchedAt: new Date("2026-08-01T12:00:00Z"),
          datePrecision: "dateOnly" as const,
        },
        resolved: RESOLVED_MOVIE,
        status: "ready" as const,
        reason: null,
      },
    ]);
    const result = await persistImportPlan({ plan, source: "letterboxd", sourceFilename: null });
    await rollbackImportBatch(result.batchId);

    // The pre-existing native event survives — rollback only removed the
    // one row it actually created.
    const summary = await getMovieWatchSummary(FIGHT_CLUB);
    expect(summary.hasWatched).toBe(true);
    expect(summary.watchCount).toBe(1);
  });

  it("preserves a later manual planning change made after the import", async () => {
    const plan = readyPlan([
      {
        record: {
          kind: "planningItem" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "movie" as const,
            title: "Fight Club",
            year: 1999,
          },
          intent: "watchlist" as const,
        },
        resolved: RESOLVED_MOVIE,
        status: "ready" as const,
        reason: null,
      },
    ]);
    const result = await persistImportPlan({ plan, source: "letterboxd", sourceFilename: null });

    // The user moves it to Backlog themselves — a real, later action.
    await changePlanningIntent("movie", FIGHT_CLUB, "backlog");

    await rollbackImportBatch(result.batchId);

    // Still there, still Backlog — the user's later choice was never
    // touched by rollback.
    const state = await getPlanningState("movie", FIGHT_CLUB);
    expect(state?.intent).toBe("backlog");
  });

  it("removes an untouched imported planning item that the user never modified", async () => {
    const plan = readyPlan([
      {
        record: {
          kind: "planningItem" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "movie" as const,
            title: "Fight Club",
            year: 1999,
          },
          intent: "watchlist" as const,
        },
        resolved: RESOLVED_MOVIE,
        status: "ready" as const,
        reason: null,
      },
    ]);
    const result = await persistImportPlan({ plan, source: "letterboxd", sourceFilename: null });
    await rollbackImportBatch(result.batchId);

    expect(await getPlanningState("movie", FIGHT_CLUB)).toBeNull();
  });

  it("preserves a diary date edit made after the import (real user modification)", async () => {
    const plan = readyPlan([
      {
        record: {
          kind: "movieWatch" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "movie" as const,
            title: "Fight Club",
            year: 1999,
          },
          watchedAt: new Date("2026-08-01T12:00:00Z"),
          datePrecision: "dateOnly" as const,
        },
        resolved: RESOLVED_MOVIE,
        status: "ready" as const,
        reason: null,
      },
    ]);
    await persistImportPlan({ plan, source: "letterboxd", sourceFilename: null });

    const [event] = await listMovieWatchEvents(FIGHT_CLUB);
    if (!event) throw new Error("expected a watch event to have been created");
    await updateMovieWatchedAt(event.id, new Date("2026-08-05T12:00:00Z"));

    const [batch] = await listImportBatches();
    if (!batch) throw new Error("expected an import batch to have been created");
    await rollbackImportBatch(batch.id);

    // The user's own date correction detached this row from the batch —
    // rollback must not remove it.
    const summary = await getMovieWatchSummary(FIGHT_CLUB);
    expect(summary.hasWatched).toBe(true);
  });

  it("never removes another user's batch", async () => {
    const otherUserId = await createTestUser();
    try {
      const plan = readyPlan([
        {
          record: {
            kind: "movieWatch" as const,
            identity: {
              kind: "titleYear" as const,
              mediaType: "movie" as const,
              title: "Fight Club",
              year: 1999,
            },
            watchedAt: new Date("2026-08-01T12:00:00Z"),
            datePrecision: "dateOnly" as const,
          },
          resolved: RESOLVED_MOVIE,
          status: "ready" as const,
          reason: null,
        },
      ]);
      const result = await persistImportPlan({ plan, source: "letterboxd", sourceFilename: null });

      requireSession.mockResolvedValue({ user: { id: otherUserId } });
      await expect(rollbackImportBatch(result.batchId)).rejects.toThrow();
    } finally {
      await deleteTestUser(otherUserId);
    }
  });

  it("rolling back twice is a safe no-op", async () => {
    const plan = readyPlan([
      {
        record: {
          kind: "movieWatch" as const,
          identity: {
            kind: "titleYear" as const,
            mediaType: "movie" as const,
            title: "Fight Club",
            year: 1999,
          },
          watchedAt: new Date("2026-08-01T12:00:00Z"),
          datePrecision: "dateOnly" as const,
        },
        resolved: RESOLVED_MOVIE,
        status: "ready" as const,
        reason: null,
      },
    ]);
    const result = await persistImportPlan({ plan, source: "letterboxd", sourceFilename: null });
    await rollbackImportBatch(result.batchId);
    await expect(rollbackImportBatch(result.batchId)).resolves.toEqual({
      removed: {
        movieWatch: 0,
        episodeWatch: 0,
        planningItem: 0,
        showTrackingState: 0,
        rating: 0,
        note: 0,
      },
    });
  });
});
