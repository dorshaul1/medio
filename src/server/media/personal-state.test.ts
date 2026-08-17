import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getPlanningIntentsBatch = vi.fn();
vi.mock("@/server/planning/planning-items", () => ({
  getPlanningIntentsBatch: (...args: unknown[]) => getPlanningIntentsBatch(...args),
}));

const getWatchedMovieIds = vi.fn();
vi.mock("@/server/tracking/movie-events", () => ({
  getWatchedMovieIds: (...args: unknown[]) => getWatchedMovieIds(...args),
}));

const getShowTrackingStatusesBatch = vi.fn();
vi.mock("@/server/tracking/show-state", () => ({
  getShowTrackingStatusesBatch: (...args: unknown[]) => getShowTrackingStatusesBatch(...args),
}));

const { getPersonalStates } = await import("./personal-state");

describe("getPersonalStates", () => {
  beforeEach(() => {
    getPlanningIntentsBatch.mockReset().mockResolvedValue(new Map());
    getWatchedMovieIds.mockReset().mockResolvedValue(new Set());
    getShowTrackingStatusesBatch.mockReset().mockResolvedValue(new Map());
  });

  it("returns an empty map without querying for an empty input", async () => {
    const result = await getPersonalStates([]);
    expect(result.size).toBe(0);
    expect(getPlanningIntentsBatch).not.toHaveBeenCalled();
  });

  it("marks a watched movie", async () => {
    getWatchedMovieIds.mockResolvedValue(new Set([550]));

    const result = await getPersonalStates([{ mediaType: "movie", mediaProviderId: 550 }]);

    expect(result.get("movie:550")).toEqual({ kind: "watched" });
  });

  it("marks an explicitly tracked show by its raw status", async () => {
    getShowTrackingStatusesBatch.mockResolvedValue(new Map([[1399, "watching"]]));

    const result = await getPersonalStates([{ mediaType: "show", mediaProviderId: 1399 }]);

    expect(result.get("show:1399")).toEqual({ kind: "watching" });
  });

  it("falls back to a planning intent when there's no watch/tracking relationship", async () => {
    getPlanningIntentsBatch.mockResolvedValue(new Map([["movie:550", "backlog"]]));

    const result = await getPersonalStates([{ mediaType: "movie", mediaProviderId: 550 }]);

    expect(result.get("movie:550")).toEqual({ kind: "backlog" });
  });

  it("resolves to 'none' when there's no relationship at all", async () => {
    const result = await getPersonalStates([{ mediaType: "movie", mediaProviderId: 550 }]);
    expect(result.get("movie:550")).toEqual({ kind: "none" });
  });

  it("prioritizes watched history over a stale planning entry for the same movie", async () => {
    getWatchedMovieIds.mockResolvedValue(new Set([550]));
    getPlanningIntentsBatch.mockResolvedValue(new Map([["movie:550", "watchlist"]]));

    const result = await getPersonalStates([{ mediaType: "movie", mediaProviderId: 550 }]);

    expect(result.get("movie:550")).toMatchObject({ kind: "watched" });
  });

  it("batches movie and show identities into their own separate queries, once each", async () => {
    await getPersonalStates([
      { mediaType: "movie", mediaProviderId: 550 },
      { mediaType: "movie", mediaProviderId: 551 },
      { mediaType: "show", mediaProviderId: 1399 },
    ]);

    expect(getWatchedMovieIds).toHaveBeenCalledTimes(1);
    expect(getWatchedMovieIds).toHaveBeenCalledWith([550, 551]);
    expect(getShowTrackingStatusesBatch).toHaveBeenCalledTimes(1);
    expect(getShowTrackingStatusesBatch).toHaveBeenCalledWith([1399]);
  });
});
