import { describe, expect, it } from "vitest";
import { groupReleaseEvents } from "./group";
import type { EpisodeReleaseEvent, MovieReleaseEvent } from "./types";

function episodeEvent(overrides: Partial<EpisodeReleaseEvent> = {}): EpisodeReleaseEvent {
  return {
    kind: "episode",
    date: "2026-08-17",
    relevance: "activeShow",
    hasAired: false,
    showProviderId: 1399,
    showTitle: "A Show",
    poster: null,
    backdrop: null,
    seasonNumber: 3,
    episodeNumber: 5,
    episodeProviderId: 900,
    episodeTitle: "An Episode",
    still: null,
    runtimeMinutes: 42,
    isSeasonPremiere: false,
    isShowPremiere: false,
    ...overrides,
  };
}

function movieEvent(overrides: Partial<MovieReleaseEvent> = {}): MovieReleaseEvent {
  return {
    kind: "movieRelease",
    date: "2026-08-17",
    relevance: "backlogMovie",
    hasAired: false,
    movieProviderId: 550,
    movieTitle: "A Movie",
    poster: null,
    backdrop: null,
    ...overrides,
  };
}

describe("groupReleaseEvents", () => {
  it("keeps distinct shows/dates as separate groups", () => {
    const groups = groupReleaseEvents([
      episodeEvent({ showProviderId: 1 }),
      episodeEvent({ showProviderId: 2 }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("collapses two episodes of the same show on the same date into one group", () => {
    const groups = groupReleaseEvents([
      episodeEvent({ showProviderId: 1, episodeNumber: 1 }),
      episodeEvent({ showProviderId: 1, episodeNumber: 2 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.events).toHaveLength(2);
  });

  it("never collapses the same show across different dates", () => {
    const groups = groupReleaseEvents([
      episodeEvent({ showProviderId: 1, date: "2026-08-17" }),
      episodeEvent({ showProviderId: 1, date: "2026-08-24" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("never collapses a movie and a show sharing the same numeric provider id", () => {
    const groups = groupReleaseEvents([
      episodeEvent({ showProviderId: 550, date: "2026-08-17" }),
      movieEvent({ movieProviderId: 550, date: "2026-08-17" }),
    ]);
    expect(groups).toHaveLength(2);
  });
});
