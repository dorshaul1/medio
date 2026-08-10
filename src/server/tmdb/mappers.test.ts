import { describe, expect, it } from "vitest";
import {
  mapAggregateCredits,
  mapPersonCastCredit,
  mapPersonCombinedCredits,
  mapPersonCrewCredit,
  mapTmdbCredits,
  mapTmdbGenre,
  mapTmdbMovieDetails,
  mapTmdbMovieSummary,
  mapTmdbPerson,
  mapTmdbSeasonDetails,
  mapTmdbShowDetails,
  mapTmdbShowSummary,
  mapTmdbVideoToTrailer,
  selectTrailer,
} from "./mappers";

describe("mapTmdbMovieSummary", () => {
  const MOVIE = {
    id: 27205,
    title: "Inception",
    original_title: "Inception",
    overview: "A thief who steals corporate secrets.",
    release_date: "2010-07-15",
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    vote_average: 8.4,
    vote_count: 35000,
    genre_ids: [28, 878],
    adult: false,
  };

  it("maps a fully-populated movie", () => {
    expect(mapTmdbMovieSummary(MOVIE)).toEqual({
      mediaType: "movie",
      id: 27205,
      title: "Inception",
      originalTitle: "Inception",
      overview: "A thief who steals corporate secrets.",
      releaseDate: "2010-07-15",
      releaseYear: 2010,
      poster: { path: "/poster.jpg" },
      backdrop: { path: "/backdrop.jpg" },
      providerRating: 8.4,
      voteCount: 35000,
      genreIds: [28, 878],
      adult: false,
    });
  });

  it("maps a missing poster to null, not a placeholder", () => {
    const result = mapTmdbMovieSummary({ ...MOVIE, poster_path: null });
    expect(result.poster).toBeNull();
  });

  it("maps an empty overview honestly to null rather than an empty string", () => {
    const result = mapTmdbMovieSummary({ ...MOVIE, overview: "" });
    expect(result.overview).toBeNull();
  });

  it("maps an empty release_date to a null date and null year", () => {
    const result = mapTmdbMovieSummary({ ...MOVIE, release_date: "" });
    expect(result.releaseDate).toBeNull();
    expect(result.releaseYear).toBeNull();
  });
});

describe("mapTmdbShowSummary", () => {
  it("normalizes name/original_name to title/originalTitle and first_air_date to releaseDate", () => {
    const result = mapTmdbShowSummary({
      id: 1399,
      name: "Game of Thrones",
      original_name: "Game of Thrones",
      overview: "Seven noble families fight.",
      first_air_date: "2011-04-17",
      poster_path: "/got.jpg",
      backdrop_path: null,
      vote_average: 8.4,
      vote_count: 21000,
      genre_ids: [18],
      adult: false,
    });

    expect(result.mediaType).toBe("show");
    expect(result.title).toBe("Game of Thrones");
    expect(result.originalTitle).toBe("Game of Thrones");
    expect(result.releaseDate).toBe("2011-04-17");
    expect(result.releaseYear).toBe(2011);
    expect(result.backdrop).toBeNull();
  });

  it("defaults a missing adult field to false — /tv/popular doesn't send one", () => {
    const result = mapTmdbShowSummary({
      id: 1399,
      name: "Game of Thrones",
      original_name: "Game of Thrones",
      overview: "",
      first_air_date: "2011-04-17",
      poster_path: null,
      backdrop_path: null,
      vote_average: 8.4,
      vote_count: 21000,
      genre_ids: [18],
    });
    expect(result.adult).toBe(false);
  });
});

describe("mapTmdbGenre", () => {
  it("maps id/name straight through", () => {
    expect(mapTmdbGenre({ id: 35, name: "Comedy" })).toEqual({ id: 35, name: "Comedy" });
  });
});

describe("mapTmdbMovieDetails", () => {
  const DETAILS = {
    id: 27205,
    title: "Inception",
    original_title: "Inception",
    overview: "A thief...",
    tagline: "Your mind is the scene of the crime.",
    release_date: "2010-07-15",
    runtime: 148,
    status: "Released",
    genres: [{ id: 28, name: "Action" }],
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    vote_average: 8.4,
    vote_count: 35000,
    original_language: "en",
    production_countries: [{ iso_3166_1: "US", name: "United States of America" }],
    adult: false,
    belongs_to_collection: null,
  };

  it("maps genres and production countries to domain shapes", () => {
    const result = mapTmdbMovieDetails(DETAILS);
    expect(result.genres).toEqual([{ id: 28, name: "Action" }]);
    expect(result.productionCountries).toEqual([{ code: "US", name: "United States of America" }]);
  });

  it("maps TMDB's runtime: 0 sentinel to null, not a real zero-minute runtime", () => {
    const result = mapTmdbMovieDetails({ ...DETAILS, runtime: 0 });
    expect(result.runtimeMinutes).toBeNull();
  });

  it("maps an empty tagline to null", () => {
    const result = mapTmdbMovieDetails({ ...DETAILS, tagline: "" });
    expect(result.tagline).toBeNull();
  });

  it("maps a null belongs_to_collection to a null collection", () => {
    expect(mapTmdbMovieDetails(DETAILS).collection).toBeNull();
  });

  it("maps a present belongs_to_collection to a MovieCollection", () => {
    const result = mapTmdbMovieDetails({
      ...DETAILS,
      belongs_to_collection: {
        id: 528,
        name: "The Dark Knight Collection",
        poster_path: "/collection-poster.jpg",
        backdrop_path: null,
      },
    });

    expect(result.collection).toEqual({
      id: 528,
      name: "The Dark Knight Collection",
      poster: { path: "/collection-poster.jpg" },
      backdrop: null,
    });
  });
});

describe("mapTmdbShowDetails", () => {
  const SHOW_DETAILS = {
    id: 1399,
    name: "Game of Thrones",
    original_name: "Game of Thrones",
    overview: "Seven noble families fight.",
    tagline: "Winter is coming.",
    first_air_date: "2011-04-17",
    last_air_date: "2019-05-19",
    status: "Ended",
    genres: [{ id: 18, name: "Drama" }],
    poster_path: "/got.jpg",
    backdrop_path: "/got-backdrop.jpg",
    vote_average: 8.4,
    vote_count: 21000,
    original_language: "en",
    number_of_seasons: 8,
    number_of_episodes: 73,
    episode_run_time: [60],
    created_by: [{ id: 9813, name: "David Benioff" }],
    seasons: [
      {
        id: 3624,
        season_number: 0,
        name: "Specials",
        overview: "",
        air_date: null,
        episode_count: 5,
        poster_path: null,
      },
      {
        id: 3625,
        season_number: 1,
        name: "Season 1",
        overview: "The first season.",
        air_date: "2011-04-17",
        episode_count: 10,
        poster_path: "/season1.jpg",
      },
    ],
    next_episode_to_air: null,
    last_episode_to_air: null,
  };

  it("maps first_air_date/last_air_date and derives firstAirYear", () => {
    const result = mapTmdbShowDetails(SHOW_DETAILS);
    expect(result.firstAirDate).toBe("2011-04-17");
    expect(result.firstAirYear).toBe(2011);
    expect(result.lastAirDate).toBe("2019-05-19");
  });

  it("preserves season 0 (specials) as its own season, not folded into season 1", () => {
    const result = mapTmdbShowDetails(SHOW_DETAILS);
    expect(result.seasons).toHaveLength(2);
    expect(result.seasons[0]?.seasonNumber).toBe(0);
    expect(result.seasons[0]?.title).toBe("Specials");
    expect(result.seasons[1]?.seasonNumber).toBe(1);
  });

  it("takes the first episode_run_time entry as the typical runtime, or null when the array is empty", () => {
    expect(mapTmdbShowDetails(SHOW_DETAILS).episodeRuntimeMinutes).toBe(60);
    expect(
      mapTmdbShowDetails({ ...SHOW_DETAILS, episode_run_time: [] }).episodeRuntimeMinutes,
    ).toBeNull();
  });

  it("maps created_by to creators with their provider id, so a creator's name can link to /people/[id]", () => {
    expect(mapTmdbShowDetails(SHOW_DETAILS).creators).toEqual([
      { id: 9813, name: "David Benioff" },
    ]);
  });

  it("maps an empty created_by to an empty creators array", () => {
    expect(mapTmdbShowDetails({ ...SHOW_DETAILS, created_by: [] }).creators).toEqual([]);
  });

  it("maps a null next_episode_to_air/last_episode_to_air to null", () => {
    const result = mapTmdbShowDetails(SHOW_DETAILS);
    expect(result.nextEpisodeToAir).toBeNull();
    expect(result.lastEpisodeToAir).toBeNull();
  });

  it("maps a present next_episode_to_air using the same episode shape as season episodes", () => {
    const result = mapTmdbShowDetails({
      ...SHOW_DETAILS,
      next_episode_to_air: {
        id: 9999,
        episode_number: 5,
        season_number: 3,
        name: "The Long Night",
        overview: "Winter comes.",
        runtime: 60,
        air_date: "2026-09-01",
        still_path: "/still.jpg",
        vote_average: 0,
      },
    });

    expect(result.nextEpisodeToAir).toEqual({
      id: 9999,
      episodeNumber: 5,
      seasonNumber: 3,
      title: "The Long Night",
      overview: "Winter comes.",
      runtimeMinutes: 60,
      airDate: "2026-09-01",
      still: { path: "/still.jpg" },
      providerRating: 0,
    });
  });
});

describe("mapTmdbSeasonDetails", () => {
  it("attaches the show ID (not present in TMDB's own season response) and preserves episode numbers", () => {
    const result = mapTmdbSeasonDetails(1399, {
      id: 3625,
      season_number: 1,
      name: "Season 1",
      overview: "The first season.",
      air_date: "2011-04-17",
      poster_path: "/season1.jpg",
      episodes: [
        {
          id: 63056,
          episode_number: 1,
          season_number: 1,
          name: "Winter Is Coming",
          overview: "Ned Stark is torn.",
          runtime: 62,
          air_date: "2011-04-17",
          still_path: "/still1.jpg",
          vote_average: 8.1,
        },
        {
          id: 63057,
          episode_number: 2,
          season_number: 1,
          name: "The Kingsroad",
          overview: "",
          runtime: 0,
          air_date: null,
          still_path: null,
          vote_average: 7.8,
        },
      ],
    });

    expect(result.showId).toBe(1399);
    expect(result.episodes).toHaveLength(2);
    expect(result.episodes[0]?.episodeNumber).toBe(1);
    expect(result.episodes[1]?.episodeNumber).toBe(2);
    expect(result.episodes[1]?.overview).toBeNull();
    expect(result.episodes[1]?.runtimeMinutes).toBeNull();
    expect(result.episodes[1]?.still).toBeNull();
  });
});

describe("mapTmdbCredits", () => {
  it("maps cast members and their profile image", () => {
    const result = mapTmdbCredits({
      cast: [
        {
          id: 819,
          name: "Edward Norton",
          character: "The Narrator",
          profile_path: "/edward.jpg",
          order: 0,
        },
      ],
      crew: [],
    });

    expect(result.cast).toEqual([
      {
        id: 819,
        name: "Edward Norton",
        character: "The Narrator",
        profile: { path: "/edward.jpg" },
      },
    ]);
  });

  it("maps a missing profile_path to null", () => {
    const result = mapTmdbCredits({
      cast: [
        { id: 819, name: "Edward Norton", character: "The Narrator", profile_path: null, order: 0 },
      ],
      crew: [],
    });
    expect(result.cast[0]?.profile).toBeNull();
  });

  it("extracts directors (with their provider id), ignoring non-directing crew", () => {
    const result = mapTmdbCredits({
      cast: [],
      crew: [
        { id: 7467, name: "David Fincher", job: "Director", department: "Directing" },
        { id: 1, name: "Someone Else", job: "Producer", department: "Production" },
      ],
    });
    expect(result.directors).toEqual([{ id: 7467, name: "David Fincher" }]);
  });

  it("returns an empty directors array when no crew member directed", () => {
    const result = mapTmdbCredits({ cast: [], crew: [] });
    expect(result.directors).toEqual([]);
  });
});

describe("selectTrailer", () => {
  const officialTrailer = {
    id: "1",
    key: "official-trailer",
    name: "Official Trailer",
    site: "YouTube",
    type: "Trailer",
    official: true,
  };
  const unofficialTrailer = { ...officialTrailer, id: "2", key: "fan-trailer", official: false };
  const officialTeaser = { ...officialTrailer, id: "3", key: "teaser", type: "Teaser" };
  const vimeoTrailer = { ...officialTrailer, id: "4", key: "vimeo-one", site: "Vimeo" };

  it("prefers an official trailer over everything else", () => {
    const result = selectTrailer([unofficialTrailer, officialTeaser, officialTrailer]);
    expect(result?.key).toBe("official-trailer");
  });

  it("falls back to any trailer when no official one exists", () => {
    const result = selectTrailer([officialTeaser, unofficialTrailer]);
    expect(result?.key).toBe("fan-trailer");
  });

  it("falls back to an official teaser when no trailer exists at all", () => {
    const result = selectTrailer([officialTeaser]);
    expect(result?.key).toBe("teaser");
  });

  it("ignores non-YouTube videos entirely", () => {
    expect(selectTrailer([vimeoTrailer])).toBeNull();
  });

  it("returns null when nothing suitable exists", () => {
    expect(selectTrailer([])).toBeNull();
  });
});

describe("mapTmdbVideoToTrailer", () => {
  it("maps key and name, dropping provider-specific fields", () => {
    const result = mapTmdbVideoToTrailer({
      id: "1",
      key: "abc123",
      name: "Official Trailer",
      site: "YouTube",
      type: "Trailer",
      official: true,
    });
    expect(result).toEqual({ key: "abc123", name: "Official Trailer" });
  });
});

describe("mapAggregateCredits", () => {
  it("maps a cast member's first role to character", () => {
    const result = mapAggregateCredits({
      cast: [
        {
          id: 22970,
          name: "Peter Dinklage",
          profile_path: "/dinklage.jpg",
          roles: [{ character: "Tyrion Lannister", episode_count: 73 }],
          order: 0,
        },
      ],
    });

    expect(result.cast).toEqual([
      {
        id: 22970,
        name: "Peter Dinklage",
        character: "Tyrion Lannister",
        profile: { path: "/dinklage.jpg" },
      },
    ]);
  });

  it("falls back to an empty character when roles is empty", () => {
    const result = mapAggregateCredits({
      cast: [{ id: 1, name: "Someone", profile_path: null, roles: [], order: 0 }],
    });
    expect(result.cast[0]?.character).toBe("");
  });

  it("maps a missing profile_path to null", () => {
    const result = mapAggregateCredits({
      cast: [
        {
          id: 22970,
          name: "Peter Dinklage",
          profile_path: null,
          roles: [{ character: "Tyrion Lannister", episode_count: 73 }],
          order: 0,
        },
      ],
    });
    expect(result.cast[0]?.profile).toBeNull();
  });
});

describe("mapTmdbPerson", () => {
  it("maps a fully-populated person", () => {
    expect(
      mapTmdbPerson({
        id: 525,
        name: "Christopher Nolan",
        biography: "A British-American filmmaker.",
        birthday: "1970-07-30",
        deathday: null,
        place_of_birth: "London, England, UK",
        profile_path: "/nolan.jpg",
        known_for_department: "Directing",
      }),
    ).toEqual({
      id: 525,
      name: "Christopher Nolan",
      profile: { path: "/nolan.jpg" },
      biography: "A British-American filmmaker.",
      knownForDepartment: "Directing",
      birthday: "1970-07-30",
      deathday: null,
      birthplace: "London, England, UK",
    });
  });

  it("maps an empty biography (TMDB's own 'unset' convention) to null", () => {
    const result = mapTmdbPerson({
      id: 525,
      name: "Christopher Nolan",
      biography: "",
      birthday: null,
      deathday: null,
      place_of_birth: null,
      profile_path: null,
      known_for_department: null,
    });
    expect(result.biography).toBeNull();
    expect(result.profile).toBeNull();
  });
});

describe("mapPersonCastCredit", () => {
  const BASE = {
    id: 27205,
    media_type: "movie" as const,
    title: "Inception",
    poster_path: "/inception.jpg",
    release_date: "2010-07-15",
    character: "Cobb",
  };

  it("maps a movie acting credit", () => {
    expect(mapPersonCastCredit(BASE)).toEqual({
      mediaType: "movie",
      mediaProviderId: 27205,
      title: "Inception",
      poster: { path: "/inception.jpg" },
      year: 2010,
      voteCount: 0,
      character: "Cobb",
      episodeCount: null,
    });
  });

  it("reads name/first_air_date (not title/release_date) for a tv credit, and carries episode_count", () => {
    const result = mapPersonCastCredit({
      id: 1399,
      media_type: "tv",
      name: "Peaky Blinders",
      poster_path: null,
      first_air_date: "2013-09-12",
      character: "Alfie Solomons",
      episode_count: 6,
    });
    expect(result).toEqual({
      mediaType: "show",
      mediaProviderId: 1399,
      title: "Peaky Blinders",
      poster: null,
      year: 2013,
      voteCount: 0,
      character: "Alfie Solomons",
      episodeCount: 6,
    });
  });

  it("never sets episodeCount for a movie credit", () => {
    expect(mapPersonCastCredit({ ...BASE, episode_count: 6 })?.episodeCount).toBeNull();
  });

  it("carries vote_count for internal Known For ranking", () => {
    expect(mapPersonCastCredit({ ...BASE, vote_count: 35000 })?.voteCount).toBe(35000);
  });

  it("drops a credit with no usable title/name", () => {
    expect(mapPersonCastCredit({ ...BASE, title: undefined })).toBeNull();
  });
});

describe("mapPersonCrewCredit", () => {
  const BASE = {
    id: 27205,
    media_type: "movie" as const,
    title: "Inception",
    poster_path: "/inception.jpg",
    release_date: "2010-07-15",
    job: "Director",
    department: "Directing",
  };

  it("maps a crew credit", () => {
    expect(mapPersonCrewCredit(BASE)).toEqual({
      mediaType: "movie",
      mediaProviderId: 27205,
      title: "Inception",
      poster: { path: "/inception.jpg" },
      year: 2010,
      voteCount: 0,
      job: "Director",
      department: "Directing",
    });
  });

  it("drops a crew credit with no job — unusable for Directing/Writing/Producing grouping", () => {
    expect(mapPersonCrewCredit({ ...BASE, job: undefined })).toBeNull();
  });
});

describe("mapPersonCombinedCredits", () => {
  it("maps cast and crew, dropping unusable entries from each independently", () => {
    const result = mapPersonCombinedCredits({
      cast: [
        {
          id: 1,
          media_type: "movie",
          title: "Inception",
          poster_path: null,
          release_date: "2010-07-15",
          character: "Cobb",
        },
        { id: 2, media_type: "movie", poster_path: null, release_date: "2011-01-01" },
      ],
      crew: [
        {
          id: 3,
          media_type: "movie",
          title: "Interstellar",
          poster_path: null,
          release_date: "2014-11-05",
          job: "Director",
          department: "Directing",
        },
        { id: 4, media_type: "movie", title: "Untitled", poster_path: null },
      ],
    });

    expect(result.cast).toHaveLength(1);
    expect(result.cast[0]?.title).toBe("Inception");
    expect(result.crew).toHaveLength(1);
    expect(result.crew[0]?.title).toBe("Interstellar");
  });
});
