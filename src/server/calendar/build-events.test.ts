import { describe, expect, it } from "vitest";
import type { Episode, MovieDetails, ShowDetails } from "@/server/media/types";
import { buildEpisodeReleaseEvent, buildMovieReleaseEvent } from "./build-events";

const NOW = new Date(Date.UTC(2026, 7, 17)); // Aug 17, 2026

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 100,
    episodeNumber: 3,
    seasonNumber: 2,
    title: "The Episode",
    overview: "",
    runtimeMinutes: 42,
    airDate: "2026-08-20",
    still: null,
    providerRating: 0,
    ...overrides,
  };
}

function show(overrides: Partial<ShowDetails> = {}): ShowDetails {
  return {
    mediaType: "show",
    id: 1,
    title: "A Show",
    originalTitle: "A Show",
    overview: null,
    tagline: null,
    status: "Returning Series",
    genres: [],
    poster: { path: "/poster.jpg" },
    backdrop: null,
    providerRating: 0,
    voteCount: 0,
    originalLanguage: "en",
    firstAirDate: "2020-01-01",
    firstAirYear: 2020,
    lastAirDate: null,
    numberOfSeasons: 2,
    numberOfEpisodes: 20,
    episodeRuntimeMinutes: 42,
    seasons: [],
    creators: [],
    nextEpisodeToAir: null,
    lastEpisodeToAir: null,
    ...overrides,
  };
}

function movie(overrides: Partial<MovieDetails> = {}): MovieDetails {
  return {
    mediaType: "movie",
    id: 5,
    title: "A Movie",
    originalTitle: "A Movie",
    overview: null,
    tagline: null,
    status: "Released",
    genres: [],
    poster: { path: "/poster.jpg" },
    backdrop: null,
    providerRating: 0,
    voteCount: 0,
    originalLanguage: "en",
    releaseDate: "2026-08-20",
    releaseYear: 2026,
    runtimeMinutes: 100,
    productionCountries: [],
    collection: null,
    ...overrides,
  };
}

describe("buildEpisodeReleaseEvent", () => {
  it("shapes a regular episode into an EpisodeReleaseEvent", () => {
    const event = buildEpisodeReleaseEvent(
      show(),
      episode({ still: { path: "/still.jpg" } }),
      "activeShow",
      NOW,
    );
    expect(event).toMatchObject({
      kind: "episode",
      date: "2026-08-20",
      relevance: "activeShow",
      hasAired: false,
      showProviderId: 1,
      showTitle: "A Show",
      seasonNumber: 2,
      episodeNumber: 3,
      isSeasonPremiere: false,
      isShowPremiere: false,
    });
    // The episode's own still, not the show's poster — see
    // docs/calendar.md, "Spoiler protection".
    expect(event?.still).toEqual({ path: "/still.jpg" });
  });

  it("flags episode 1 of any season as a season premiere", () => {
    const event = buildEpisodeReleaseEvent(
      show(),
      episode({ episodeNumber: 1, seasonNumber: 3 }),
      "activeShow",
      NOW,
    );
    expect(event?.isSeasonPremiere).toBe(true);
    expect(event?.isShowPremiere).toBe(false);
  });

  it("flags season 1 episode 1 as both a season premiere and a show premiere", () => {
    const event = buildEpisodeReleaseEvent(
      show(),
      episode({ episodeNumber: 1, seasonNumber: 1 }),
      "activeShow",
      NOW,
    );
    expect(event?.isSeasonPremiere).toBe(true);
    expect(event?.isShowPremiere).toBe(true);
  });

  it("marks hasAired true for a date on or before now", () => {
    const event = buildEpisodeReleaseEvent(
      show(),
      episode({ airDate: "2026-08-10" }),
      "activeShow",
      NOW,
    );
    expect(event?.hasAired).toBe(true);
  });

  it("returns null when the episode has no air date on file", () => {
    expect(
      buildEpisodeReleaseEvent(show(), episode({ airDate: null }), "activeShow", NOW),
    ).toBeNull();
  });
});

describe("buildMovieReleaseEvent", () => {
  it("shapes a movie into a MovieReleaseEvent", () => {
    const event = buildMovieReleaseEvent(movie(), "backlogMovie", NOW);
    expect(event).toMatchObject({
      kind: "movieRelease",
      date: "2026-08-20",
      relevance: "backlogMovie",
      hasAired: false,
      movieProviderId: 5,
      movieTitle: "A Movie",
    });
  });

  it("returns null when the movie has no release date on file", () => {
    expect(buildMovieReleaseEvent(movie({ releaseDate: null }), "backlogMovie", NOW)).toBeNull();
  });
});
