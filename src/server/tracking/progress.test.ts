import { describe, expect, it } from "vitest";
import type { Episode } from "@/server/media/types";
import {
  lastWatchedEpisode,
  nextUnwatchedEpisode,
  relevantAiredEpisodes,
  uniqueWatchedEpisodeKeys,
} from "./progress";
import type { EpisodeWatchEvent } from "./types";

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
    id: "event-1",
    showProviderId: 1399,
    seasonNumber: 1,
    episodeNumber: 1,
    episodeProviderId: 1,
    watchedAt: new Date("2020-01-02T00:00:00Z"),
    createdAt: new Date("2020-01-02T00:00:00Z"),
    ...overrides,
  };
}

describe("relevantAiredEpisodes", () => {
  const asOf = new Date("2024-06-01T00:00:00Z");

  it("excludes Specials (season 0)", () => {
    const episodes = [episode({ seasonNumber: 0, episodeNumber: 1 }), episode({ seasonNumber: 1 })];
    expect(relevantAiredEpisodes(episodes, asOf)).toHaveLength(1);
    expect(relevantAiredEpisodes(episodes, asOf)[0]?.seasonNumber).toBe(1);
  });

  it("excludes episodes with no air date on file — never assumed aired", () => {
    const episodes = [episode({ airDate: null })];
    expect(relevantAiredEpisodes(episodes, asOf)).toHaveLength(0);
  });

  it("excludes a future episode that hasn't aired yet", () => {
    const episodes = [episode({ airDate: "2099-01-01" })];
    expect(relevantAiredEpisodes(episodes, asOf)).toHaveLength(0);
  });

  it("includes an episode that aired exactly on the reference date", () => {
    const episodes = [episode({ airDate: "2024-06-01" })];
    expect(relevantAiredEpisodes(episodes, asOf)).toHaveLength(1);
  });
});

describe("uniqueWatchedEpisodeKeys", () => {
  it("collapses three watch events for the same episode into one unique identity", () => {
    const events = [watchEvent({ id: "1" }), watchEvent({ id: "2" }), watchEvent({ id: "3" })];
    expect(uniqueWatchedEpisodeKeys(events).size).toBe(1);
  });

  it("keeps distinct episodes as distinct identities", () => {
    const events = [watchEvent({ episodeNumber: 1 }), watchEvent({ episodeNumber: 2 })];
    expect(uniqueWatchedEpisodeKeys(events).size).toBe(2);
  });
});

describe("lastWatchedEpisode", () => {
  it("returns null when there is no history", () => {
    expect(lastWatchedEpisode([])).toBeNull();
  });

  it("picks the most recently watched episode by watchedAt, not the highest episode number", () => {
    const events = [
      watchEvent({ episodeNumber: 5, watchedAt: new Date("2024-01-10T00:00:00Z") }),
      // Watched later in real time, even though it's an earlier episode
      // (a rewatch, or out-of-order viewing).
      watchEvent({ episodeNumber: 1, watchedAt: new Date("2024-02-01T00:00:00Z") }),
    ];
    const result = lastWatchedEpisode(events);
    expect(result?.episodeNumber).toBe(1);
  });
});

describe("nextUnwatchedEpisode", () => {
  const asOf = new Date("2024-06-01T00:00:00Z");

  it("returns the earliest unwatched aired episode in canonical order", () => {
    const episodes = [
      episode({ seasonNumber: 1, episodeNumber: 1, airDate: "2020-01-01" }),
      episode({ seasonNumber: 1, episodeNumber: 2, airDate: "2020-01-08" }),
      episode({ seasonNumber: 2, episodeNumber: 1, airDate: "2020-06-01" }),
    ];
    const events = [watchEvent({ seasonNumber: 1, episodeNumber: 1 })];

    const result = nextUnwatchedEpisode({ episodes, events, asOf });
    expect(result).toEqual({ seasonNumber: 1, episodeNumber: 2 });
  });

  it("ignores unaired future episodes", () => {
    const episodes = [episode({ seasonNumber: 1, episodeNumber: 1, airDate: "2099-01-01" })];
    expect(nextUnwatchedEpisode({ episodes, events: [], asOf })).toBeNull();
  });

  it("returns null when everything relevant is already watched", () => {
    const episodes = [episode({ seasonNumber: 1, episodeNumber: 1, airDate: "2020-01-01" })];
    const events = [watchEvent({ seasonNumber: 1, episodeNumber: 1 })];
    expect(nextUnwatchedEpisode({ episodes, events, asOf })).toBeNull();
  });

  it("ignores Specials when looking for the next unwatched episode", () => {
    const episodes = [
      episode({ seasonNumber: 0, episodeNumber: 1, airDate: "2020-01-01" }),
      episode({ seasonNumber: 1, episodeNumber: 1, airDate: "2020-01-02" }),
    ];
    const result = nextUnwatchedEpisode({ episodes, events: [], asOf });
    expect(result).toEqual({ seasonNumber: 1, episodeNumber: 1 });
  });
});
