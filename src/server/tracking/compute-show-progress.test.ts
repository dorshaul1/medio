import { describe, expect, it } from "vitest";
import type { Episode } from "@/server/media/types";
import { computeShowProgress } from "./compute-show-progress";
import type { EpisodeWatchEvent } from "./types";

const ASOF = new Date("2024-06-01T00:00:00Z");

function episode(overrides: Partial<Episode>): Episode {
  return {
    id: 1,
    episodeNumber: 1,
    seasonNumber: 1,
    title: "Episode",
    overview: null,
    runtimeMinutes: null,
    airDate: "2020-01-01",
    still: null,
    providerRating: 0,
    ...overrides,
  };
}

function watchEvent(overrides: Partial<EpisodeWatchEvent>): EpisodeWatchEvent {
  return {
    id: crypto.randomUUID(),
    showProviderId: 1399,
    seasonNumber: 1,
    episodeNumber: 1,
    episodeProviderId: 1,
    watchedAt: new Date("2020-01-02T00:00:00Z"),
    createdAt: new Date("2020-01-02T00:00:00Z"),
    ...overrides,
  };
}

// 10 aired regular-season episodes, none watched by default.
function tenAiredEpisodes(): Episode[] {
  return Array.from({ length: 10 }, (_, i) =>
    episode({ id: i + 1, seasonNumber: 1, episodeNumber: i + 1, airDate: "2020-01-01" }),
  );
}

describe("computeShowProgress", () => {
  it("computes 8/10 watched as an 80% completion ratio with 2 remaining", () => {
    const episodes = tenAiredEpisodes();
    const events = episodes
      .slice(0, 8)
      .map((e) => watchEvent({ seasonNumber: e.seasonNumber, episodeNumber: e.episodeNumber }));

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Returning Series",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    expect(result.airedEpisodeCount).toBe(10);
    expect(result.uniqueWatchedAiredEpisodeCount).toBe(8);
    expect(result.remainingAiredEpisodeCount).toBe(2);
    expect(result.completionRatio).toBeCloseTo(0.8);
    expect(result.derivedViewingState).toBe("watching");
    expect(result.nextUnwatchedEpisode).toEqual({ seasonNumber: 1, episodeNumber: 9 });
  });

  it("a rewatch of an earlier episode doesn't change the next unwatched episode", () => {
    const episodes = tenAiredEpisodes();
    const events = [
      ...episodes
        .slice(0, 5)
        .map((e) => watchEvent({ seasonNumber: e.seasonNumber, episodeNumber: e.episodeNumber })),
      // A rewatch of episode 1, well after the others — legitimate recent
      // activity, but must not make episode 1 look "next".
      watchEvent({
        seasonNumber: 1,
        episodeNumber: 1,
        watchedAt: new Date("2024-05-01T00:00:00Z"),
      }),
    ];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Returning Series",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    expect(result.nextUnwatchedEpisode).toEqual({ seasonNumber: 1, episodeNumber: 6 });
  });

  it("nextUnwatchedEpisode is null once everything aired has been watched", () => {
    const episodes = [episode({ seasonNumber: 1, episodeNumber: 1 })];
    const events = [watchEvent({})];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Ended",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    expect(result.nextUnwatchedEpisode).toBeNull();
  });

  it("does not let rewatches inflate progress — 3 events for one episode still count as 1", () => {
    const episodes = [episode({ seasonNumber: 1, episodeNumber: 1 })];
    const events = [
      watchEvent({ watchedAt: new Date("2020-02-01T00:00:00Z") }),
      watchEvent({ watchedAt: new Date("2021-02-01T00:00:00Z") }),
      watchEvent({ watchedAt: new Date("2022-02-01T00:00:00Z") }),
    ];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Ended",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    expect(result.uniqueWatchedAiredEpisodeCount).toBe(1);
    expect(result.completionRatio).toBe(1);
  });

  it("excludes a future episode from the denominator entirely", () => {
    const episodes = [
      episode({ seasonNumber: 1, episodeNumber: 1, airDate: "2020-01-01" }),
      episode({ seasonNumber: 1, episodeNumber: 2, airDate: "2099-01-01" }),
    ];
    const events = [watchEvent({ episodeNumber: 1 })];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Returning Series",
      hasKnownFutureEpisode: true,
      asOf: ASOF,
    });

    expect(result.airedEpisodeCount).toBe(1);
    expect(result.uniqueWatchedAiredEpisodeCount).toBe(1);
    expect(result.derivedViewingState).toBe("waiting");
  });

  it("does not let unwatched Specials block caught_up/completed status", () => {
    const episodes = [
      episode({ seasonNumber: 0, episodeNumber: 1, airDate: "2020-01-01" }), // unwatched special
      episode({ seasonNumber: 1, episodeNumber: 1, airDate: "2020-01-02" }),
    ];
    const events = [watchEvent({ seasonNumber: 1, episodeNumber: 1 })];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Ended",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    expect(result.airedEpisodeCount).toBe(1);
    expect(result.derivedViewingState).toBe("completed");
  });

  it("records a watched Special as real history without corrupting standard progress", () => {
    const episodes = [
      episode({ seasonNumber: 0, episodeNumber: 1, airDate: "2020-01-01" }),
      episode({ seasonNumber: 1, episodeNumber: 1, airDate: "2020-01-02" }),
    ];
    const events = [
      watchEvent({ seasonNumber: 0, episodeNumber: 1 }),
      watchEvent({ seasonNumber: 1, episodeNumber: 1 }),
    ];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Ended",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    // Only the regular-season episode counts toward the denominator —
    // the Special's own watch event still exists in `events` (real
    // history) but doesn't change airedEpisodeCount or the ratio.
    expect(result.airedEpisodeCount).toBe(1);
    expect(result.uniqueWatchedAiredEpisodeCount).toBe(1);
    expect(result.completionRatio).toBe(1);
  });

  it("all aired regular episodes watched + ended show = completed", () => {
    const episodes = [episode({ seasonNumber: 1, episodeNumber: 1 })];
    const events = [watchEvent({})];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Ended",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    expect(result.derivedViewingState).toBe("completed");
  });

  it("all aired regular episodes watched + active show + known future episode = waiting", () => {
    const episodes = [episode({ seasonNumber: 1, episodeNumber: 1 })];
    const events = [watchEvent({})];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Returning Series",
      hasKnownFutureEpisode: true,
      asOf: ASOF,
    });

    expect(result.derivedViewingState).toBe("waiting");
  });

  it("all aired regular episodes watched + active show + no known future episode = caught_up", () => {
    const episodes = [episode({ seasonNumber: 1, episodeNumber: 1 })];
    const events = [watchEvent({})];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Returning Series",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    expect(result.derivedViewingState).toBe("caught_up");
  });

  it("reports the last watched episode by watchedAt, not event insertion order", () => {
    const episodes = [
      episode({ seasonNumber: 1, episodeNumber: 1 }),
      episode({ seasonNumber: 1, episodeNumber: 2 }),
    ];
    const events = [
      watchEvent({ episodeNumber: 2, watchedAt: new Date("2020-01-05T00:00:00Z") }),
      watchEvent({ episodeNumber: 1, watchedAt: new Date("2020-01-10T00:00:00Z") }),
    ];

    const result = computeShowProgress({
      episodes,
      events,
      explicitState: "watching",
      showStatus: "Ended",
      hasKnownFutureEpisode: false,
      asOf: ASOF,
    });

    expect(result.lastWatchedEpisode).toEqual({ seasonNumber: 1, episodeNumber: 1 });
  });
});
