import { describe, expect, it } from "vitest";
import { filterReleaseEvents } from "./filter";
import type { EpisodeReleaseEvent, MovieReleaseEvent } from "./types";

const episode: EpisodeReleaseEvent = {
  kind: "episode",
  date: "2026-08-17",
  relevance: "activeShow",
  hasAired: false,
  showProviderId: 1,
  showTitle: "Show",
  poster: null,
  backdrop: null,
  seasonNumber: 1,
  episodeNumber: 1,
  episodeProviderId: 1,
  episodeTitle: "Episode",
  still: null,
  runtimeMinutes: 42,
  isSeasonPremiere: false,
  isShowPremiere: false,
};

const movie: MovieReleaseEvent = {
  kind: "movieRelease",
  date: "2026-08-20",
  relevance: "backlogMovie",
  hasAired: false,
  movieProviderId: 5,
  movieTitle: "Movie",
  poster: null,
  backdrop: null,
};

describe("filterReleaseEvents", () => {
  it("returns everything for 'all'", () => {
    expect(filterReleaseEvents([episode, movie], "all")).toEqual([episode, movie]);
  });

  it("keeps only episode events for 'tv'", () => {
    expect(filterReleaseEvents([episode, movie], "tv")).toEqual([episode]);
  });

  it("keeps only movie events for 'movies'", () => {
    expect(filterReleaseEvents([episode, movie], "movies")).toEqual([movie]);
  });
});
