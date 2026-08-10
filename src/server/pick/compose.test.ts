import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const getContinueCandidates = vi.fn();
vi.mock("./candidates-continue", () => ({
  getContinueCandidates: () => getContinueCandidates(),
}));

const getSavedCandidates = vi.fn();
vi.mock("./candidates-saved", () => ({ getSavedCandidates: () => getSavedCandidates() }));

const getDiscoveryCandidates = vi.fn();
vi.mock("./candidates-discovery", () => ({
  getDiscoveryCandidates: (...args: unknown[]) => getDiscoveryCandidates(...args),
}));

const getRecommendationTasteSummary = vi.fn();
vi.mock("./taste-summary", () => ({
  getRecommendationTasteSummary: (...args: unknown[]) => getRecommendationTasteSummary(...args),
}));

const { getPickRecommendations } = await import("./compose");

const EMPTY_TASTE = {
  hasEnoughDataForPersonalization: false,
  movieGenreAffinities: [],
  showGenreAffinities: [],
  topDirector: null,
  seedMovies: [],
  seedShows: [],
};

const ANY = { mediaType: "any" as const, timeBudgetMinutes: null };

function continueCandidate(id: number) {
  return {
    kind: "continueEpisode" as const,
    mediaType: "show" as const,
    mediaProviderId: id,
    title: `Show ${id}`,
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 40,
    remainingAiredEpisodeCount: 3,
    isFinishSoon: false,
    lastActivityAt: new Date("2000-01-01T00:00:00Z"),
    nextEpisode: { seasonNumber: 1, episodeNumber: 1, episodeProviderId: id },
  };
}

function discoveryMovie(id: number, runtimeMinutes: number | null = 100) {
  return {
    kind: "discoveryMovie" as const,
    mediaType: "movie" as const,
    mediaProviderId: id,
    title: `Movie ${id}`,
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes,
    source: "popular" as const,
    seedTitle: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue({ user: { id: "user-1" } });
  getContinueCandidates.mockResolvedValue([]);
  getSavedCandidates.mockResolvedValue({ movies: [], shows: [] });
  getRecommendationTasteSummary.mockResolvedValue(EMPTY_TASTE);
  getDiscoveryCandidates.mockResolvedValue({ movies: [], shows: [] });
});

describe("getPickRecommendations", () => {
  it("returns an empty result when every pool is empty", async () => {
    const result = await getPickRecommendations(ANY);
    expect(result).toEqual({ primary: null, alternatives: [], relaxedTimeConstraint: false });
  });

  it("a continuing show always wins over a discovery pick", async () => {
    getContinueCandidates.mockResolvedValue([continueCandidate(1)]);
    getDiscoveryCandidates.mockResolvedValue({ movies: [discoveryMovie(2)], shows: [] });

    const result = await getPickRecommendations(ANY);
    expect(result.primary?.candidate.mediaProviderId).toBe(1);
  });

  it("excludes an actively-continuing show's id from Discovery's exclusion set", async () => {
    getContinueCandidates.mockResolvedValue([continueCandidate(1)]);

    await getPickRecommendations(ANY);

    expect(getDiscoveryCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ excludeShowIds: new Set([1]) }),
    );
  });

  it("relaxes the time constraint when the strict budget yields nothing, and reports it", async () => {
    getDiscoveryCandidates.mockResolvedValue({ movies: [discoveryMovie(1, 200)], shows: [] });

    const result = await getPickRecommendations({ mediaType: "any", timeBudgetMinutes: 35 });

    expect(result.primary?.candidate.mediaProviderId).toBe(1);
    expect(result.relaxedTimeConstraint).toBe(true);
  });

  it("never relaxes media type, even with zero eligible results", async () => {
    getDiscoveryCandidates.mockResolvedValue({ movies: [discoveryMovie(1)], shows: [] });

    const result = await getPickRecommendations({ mediaType: "show", timeBudgetMinutes: null });
    expect(result.primary).toBeNull();
  });

  it("respects the session-scoped exclusion set ('Not now'/'Another Pick')", async () => {
    getContinueCandidates.mockResolvedValue([continueCandidate(1), continueCandidate(2)]);

    const result = await getPickRecommendations(ANY, new Set([1]));
    expect(result.primary?.candidate.mediaProviderId).toBe(2);
  });

  it("skips the Discovery request entirely once local candidates already fill the result", async () => {
    // Primary + 2 alternatives, all from cheap local pools — Discovery
    // would only ever have competed for a slot that's already spoken for.
    getContinueCandidates.mockResolvedValue([
      continueCandidate(1),
      continueCandidate(2),
      continueCandidate(3),
    ]);

    await getPickRecommendations(ANY);

    expect(getDiscoveryCandidates).not.toHaveBeenCalled();
  });

  it("still fetches Discovery when the local pool alone can't fill the result", async () => {
    getContinueCandidates.mockResolvedValue([continueCandidate(1), continueCandidate(2)]);

    await getPickRecommendations(ANY);

    expect(getDiscoveryCandidates).toHaveBeenCalled();
  });
});
