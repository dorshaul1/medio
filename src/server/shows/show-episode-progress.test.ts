import "@/server/test-support/test-env";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getSeasonDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getSeasonDetails: (...args: unknown[]) => getSeasonDetails(...args),
}));

const { getShowEpisodeProgress } = await import("./show-episode-progress");

function season(seasonNumber: number, episodeCount: number) {
  return {
    id: seasonNumber,
    seasonNumber,
    title: `Season ${seasonNumber}`,
    overview: null,
    airDate: "2020-01-01",
    episodeCount,
    poster: null,
  };
}

function seasonDetails(showId: number, seasonNumber: number, episodes: unknown[]) {
  return {
    showId,
    id: seasonNumber,
    seasonNumber,
    title: `Season ${seasonNumber}`,
    overview: null,
    airDate: "2020-01-01",
    poster: null,
    episodes,
  };
}

function episode(seasonNumber: number, episodeNumber: number, airDate: string, id: number) {
  return {
    id,
    episodeNumber,
    seasonNumber,
    title: `S${seasonNumber}E${episodeNumber}`,
    overview: "",
    runtimeMinutes: 42,
    airDate,
    still: null,
    providerRating: 0,
  };
}

describe("getShowEpisodeProgress — hasKnownFutureEpisode threading", () => {
  it("resolves to caught_up when every aired episode is watched and no future episode is known", async () => {
    getSeasonDetails.mockResolvedValue(seasonDetails(1, 1, [episode(1, 1, "2020-01-01", 100)]));

    const { progress } = await getShowEpisodeProgress({
      showProviderId: 1,
      seasons: [season(1, 1)],
      showStatus: "Returning Series",
      explicitState: "watching",
      events: [{ seasonNumber: 1, episodeNumber: 1, watchedAt: new Date() } as never],
      hasKnownFutureEpisode: false,
    });

    expect(progress.derivedViewingState).toBe("caught_up");
  });

  it("resolves to waiting instead, once a real ShowDetails next_episode_to_air is known", async () => {
    getSeasonDetails.mockResolvedValue(seasonDetails(1, 1, [episode(1, 1, "2020-01-01", 100)]));

    const { progress } = await getShowEpisodeProgress({
      showProviderId: 1,
      seasons: [season(1, 1)],
      showStatus: "Returning Series",
      explicitState: "watching",
      events: [{ seasonNumber: 1, episodeNumber: 1, watchedAt: new Date() } as never],
      hasKnownFutureEpisode: true,
    });

    expect(progress.derivedViewingState).toBe("waiting");
  });
});
