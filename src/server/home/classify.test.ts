import { describe, expect, it } from "vitest";
import { classifyActiveShows } from "./classify";
import type { ActiveShowContinuation } from "./types";

function show(
  overrides: Partial<ActiveShowContinuation> & { showProviderId: number },
): ActiveShowContinuation {
  return {
    title: `Show ${overrides.showProviderId}`,
    poster: null,
    backdrop: null,
    year: 2020,
    lastActivityAt: new Date("2024-01-01"),
    airedEpisodeCount: 10,
    watchedEpisodeCount: 0,
    remainingAiredEpisodeCount: 10,
    nextEpisode: {
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: overrides.showProviderId * 1000,
      title: "Episode",
      runtimeMinutes: 45,
    },
    ...overrides,
  };
}

describe("classifyActiveShows", () => {
  it("returns null upNext and empty buckets for no candidates", () => {
    expect(classifyActiveShows([])).toEqual({ upNext: null, finishSoon: [], continueWatching: [] });
  });

  it("the most recently active candidate becomes Up Next", () => {
    const a = show({ showProviderId: 1, remainingAiredEpisodeCount: 20 });
    const b = show({ showProviderId: 2, remainingAiredEpisodeCount: 20 });
    // Caller passes candidates already ordered most-recent-first.
    const result = classifyActiveShows([a, b]);
    expect(result.upNext?.showProviderId).toBe(1);
  });

  it("renders Up Next only when there's a single eligible show — no one-item Continue Watching", () => {
    const only = show({ showProviderId: 1 });
    const result = classifyActiveShows([only]);
    expect(result.upNext?.showProviderId).toBe(1);
    expect(result.continueWatching).toHaveLength(0);
    expect(result.finishSoon).toHaveLength(0);
  });

  it("puts a show with few remaining episodes into Finish Soon, not Continue Watching", () => {
    const upNextCandidate = show({ showProviderId: 1, remainingAiredEpisodeCount: 20 });
    const finishSoonCandidate = show({ showProviderId: 2, remainingAiredEpisodeCount: 2 });
    const result = classifyActiveShows([upNextCandidate, finishSoonCandidate]);

    expect(result.finishSoon.map((s) => s.showProviderId)).toEqual([2]);
    expect(result.continueWatching).toHaveLength(0);
  });

  it("puts a show with many remaining episodes into Continue Watching, not Finish Soon", () => {
    const upNextCandidate = show({ showProviderId: 1, remainingAiredEpisodeCount: 20 });
    const continueCandidate = show({ showProviderId: 2, remainingAiredEpisodeCount: 8 });
    const result = classifyActiveShows([upNextCandidate, continueCandidate]);

    expect(result.continueWatching.map((s) => s.showProviderId)).toEqual([2]);
    expect(result.finishSoon).toHaveLength(0);
  });

  it("never duplicates the Up Next show into Finish Soon or Continue Watching", () => {
    // Up Next itself has few remaining episodes — must still only appear once.
    const upNextCandidate = show({ showProviderId: 1, remainingAiredEpisodeCount: 1 });
    const other = show({ showProviderId: 2, remainingAiredEpisodeCount: 8 });
    const result = classifyActiveShows([upNextCandidate, other]);

    expect(result.upNext?.showProviderId).toBe(1);
    expect(result.finishSoon.some((s) => s.showProviderId === 1)).toBe(false);
    expect(result.continueWatching.some((s) => s.showProviderId === 1)).toBe(false);
  });

  it("splits several candidates deterministically across all three buckets", () => {
    const candidates = [
      show({ showProviderId: 1, remainingAiredEpisodeCount: 5 }), // Up Next
      show({ showProviderId: 2, remainingAiredEpisodeCount: 3 }), // Finish Soon
      show({ showProviderId: 3, remainingAiredEpisodeCount: 12 }), // Continue Watching
      show({ showProviderId: 4, remainingAiredEpisodeCount: 1 }), // Finish Soon
    ];
    const result = classifyActiveShows(candidates);

    expect(result.upNext?.showProviderId).toBe(1);
    expect(result.finishSoon.map((s) => s.showProviderId)).toEqual([2, 4]);
    expect(result.continueWatching.map((s) => s.showProviderId)).toEqual([3]);
  });
});
