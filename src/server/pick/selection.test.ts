import { describe, expect, it } from "vitest";
import { selectPicks } from "./selection";
import type { PickCandidate, ReasonFact, ScoredCandidate } from "./types";

function candidate(id: number, kind: PickCandidate["kind"]): PickCandidate {
  const common = {
    mediaProviderId: id,
    title: `Title ${id}`,
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 100,
  };

  switch (kind) {
    case "continueEpisode":
      return {
        ...common,
        kind,
        mediaType: "show",
        remainingAiredEpisodeCount: 3,
        isFinishSoon: false,
        lastActivityAt: new Date("2000-01-01T00:00:00Z"),
        nextEpisode: { seasonNumber: 1, episodeNumber: 1, episodeProviderId: id },
      };
    case "savedMovie":
      return { ...common, kind, mediaType: "movie", intent: "watchlist" };
    case "savedShow":
      return { ...common, kind, mediaType: "show", intent: "watchlist" };
    case "discoveryMovie":
      return { ...common, kind, mediaType: "movie", source: "popular", seedTitle: null };
    case "discoveryShow":
      return { ...common, kind, mediaType: "show", source: "popular", seedTitle: null };
  }
}

function scored(
  id: number,
  kind: PickCandidate["kind"],
  score: number,
  reasons: readonly ReasonFact[] = [{ kind: "popularDiscovery" }],
): ScoredCandidate {
  return { candidate: candidate(id, kind), score, reasons };
}

describe("selectPicks", () => {
  it("returns null primary and no alternatives for an empty pool", () => {
    expect(selectPicks([])).toEqual({ primary: null, alternatives: [] });
  });

  it("primary is always the single highest-scoring candidate", () => {
    const result = selectPicks([
      scored(1, "discoveryMovie", 10),
      scored(2, "savedMovie", 50),
      scored(3, "continueEpisode", 100),
    ]);
    expect(result.primary?.candidate.mediaProviderId).toBe(3);
  });

  it("ties break deterministically by ascending media provider id", () => {
    const result = selectPicks([scored(5, "discoveryMovie", 10), scored(2, "discoveryShow", 10)]);
    expect(result.primary?.candidate.mediaProviderId).toBe(2);
  });

  it("prefers a close-scoring, differing-kind alternative over a same-kind one", () => {
    const result = selectPicks([
      scored(1, "continueEpisode", 100),
      scored(2, "continueEpisode", 95), // same kind as primary, close score
      scored(3, "savedMovie", 90), // different kind, close score — should win the diversity slot
      scored(4, "discoveryMovie", 20),
    ]);
    expect(result.primary?.candidate.mediaProviderId).toBe(1);
    expect(result.alternatives.map((a) => a.candidate.mediaProviderId)).toEqual([3, 2]);
  });

  it("falls back to the next-best candidate when no differing-kind option is close enough", () => {
    const result = selectPicks([
      scored(1, "continueEpisode", 100),
      scored(2, "continueEpisode", 95),
      scored(3, "continueEpisode", 90),
      scored(4, "savedMovie", 1), // wildly different score, outside the diversity band
    ]);
    expect(result.alternatives.map((a) => a.candidate.mediaProviderId)).toEqual([2, 3]);
  });

  it("never repeats the same media provider id across primary and alternatives", () => {
    const result = selectPicks([
      scored(1, "continueEpisode", 100),
      scored(2, "savedMovie", 80),
      scored(3, "discoveryMovie", 50),
    ]);
    const ids = [result.primary, ...result.alternatives].map(
      (rec) => rec?.candidate.mediaProviderId,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("excludes ids in the exclusion set entirely (session 'Not now')", () => {
    const result = selectPicks(
      [scored(1, "continueEpisode", 100), scored(2, "savedMovie", 80)],
      new Set([1]),
    );
    expect(result.primary?.candidate.mediaProviderId).toBe(2);
  });

  it("trims a recommendation's reasons to at most two", () => {
    const result = selectPicks([
      scored(1, "discoveryMovie", 10, [
        { kind: "highGenreAffinity", genreName: "Action" },
        { kind: "directorAffinity", directorName: "Nolan" },
        { kind: "timeFit", minutes: 90 },
      ]),
    ]);
    expect(result.primary?.reasons).toHaveLength(2);
    expect(result.primary?.reasons[0]).toEqual({ kind: "highGenreAffinity", genreName: "Action" });
  });

  it("returns fewer than 3 total picks when the pool is smaller than that", () => {
    const result = selectPicks([scored(1, "continueEpisode", 100)]);
    expect(result.primary).not.toBeNull();
    expect(result.alternatives).toHaveLength(0);
  });
});
