import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getPersonalHome = vi.fn();
vi.mock("@/server/home/queries", () => ({ getPersonalHome: () => getPersonalHome() }));

const { getContinueCandidates } = await import("./candidates-continue");

function activeShow(overrides: Record<string, unknown> = {}) {
  return {
    showProviderId: 1,
    title: "A Show",
    poster: null,
    backdrop: null,
    year: 2020,
    lastActivityAt: new Date(),
    airedEpisodeCount: 10,
    watchedEpisodeCount: 5,
    remainingAiredEpisodeCount: 5,
    nextEpisode: {
      seasonNumber: 1,
      episodeNumber: 6,
      episodeProviderId: 100,
      title: "Ep 6",
      runtimeMinutes: 42,
    },
    ...overrides,
  };
}

describe("getContinueCandidates", () => {
  it("maps Up Next into a continueEpisode candidate, not Finish Soon", async () => {
    getPersonalHome.mockResolvedValue({
      upNext: activeShow({ showProviderId: 1 }),
      finishSoon: [],
      continueWatching: [],
    });

    const candidates = await getContinueCandidates();

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: "continueEpisode",
      mediaProviderId: 1,
      isFinishSoon: false,
      runtimeMinutes: 42,
    });
  });

  it("marks Finish Soon shows as isFinishSoon", async () => {
    getPersonalHome.mockResolvedValue({
      upNext: null,
      finishSoon: [activeShow({ showProviderId: 2, remainingAiredEpisodeCount: 1 })],
      continueWatching: [],
    });

    const candidates = await getContinueCandidates();
    expect(candidates[0]).toMatchObject({ mediaProviderId: 2, isFinishSoon: true });
  });

  it("combines Up Next, Finish Soon, and Continue Watching into one list", async () => {
    getPersonalHome.mockResolvedValue({
      upNext: activeShow({ showProviderId: 1 }),
      finishSoon: [activeShow({ showProviderId: 2 })],
      continueWatching: [activeShow({ showProviderId: 3 })],
    });

    const candidates = await getContinueCandidates();
    expect(candidates.map((c) => c.mediaProviderId)).toEqual([1, 2, 3]);
  });

  it("returns an empty list when Home has nothing active", async () => {
    getPersonalHome.mockResolvedValue({ upNext: null, finishSoon: [], continueWatching: [] });
    expect(await getContinueCandidates()).toEqual([]);
  });
});
