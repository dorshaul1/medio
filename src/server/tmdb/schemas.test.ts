import { describe, expect, it } from "vitest";
import {
  tmdbAggregateCreditsResponseSchema,
  tmdbCollectionDetailsSchema,
  tmdbCreditsResponseSchema,
  tmdbMovieDetailsSchema,
  tmdbMovieResultSchema,
  tmdbPersonCombinedCreditsResponseSchema,
  tmdbPersonDetailsSchema,
  tmdbSeasonDetailsSchema,
  tmdbShowDetailsSchema,
  tmdbShowResultSchema,
  tmdbVideosResponseSchema,
} from "./schemas";

const VALID_MOVIE_RESULT = {
  id: 27205,
  title: "Inception",
  original_title: "Inception",
  overview: "A thief who steals corporate secrets...",
  release_date: "2010-07-15",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  vote_average: 8.4,
  vote_count: 35000,
  genre_ids: [28, 878],
  adult: false,
};

describe("tmdbMovieResultSchema", () => {
  it("accepts a well-formed movie result", () => {
    expect(() => tmdbMovieResultSchema.parse(VALID_MOVIE_RESULT)).not.toThrow();
  });

  it("accepts null poster/backdrop paths — TMDB sends null, not omission, for missing images", () => {
    expect(() =>
      tmdbMovieResultSchema.parse({
        ...VALID_MOVIE_RESULT,
        poster_path: null,
        backdrop_path: null,
      }),
    ).not.toThrow();
  });

  it("accepts an empty overview/release_date — TMDB's actual representation of 'unknown'", () => {
    expect(() =>
      tmdbMovieResultSchema.parse({ ...VALID_MOVIE_RESULT, overview: "", release_date: "" }),
    ).not.toThrow();
  });

  it("ignores extra fields TMDB might add", () => {
    const withExtra = { ...VALID_MOVIE_RESULT, some_future_field: "unexpected" };
    const result = tmdbMovieResultSchema.parse(withExtra);
    expect(result).not.toHaveProperty("some_future_field");
  });

  it("rejects a result missing a field we depend on", () => {
    const { id: _omit, ...rest } = VALID_MOVIE_RESULT;
    expect(() => tmdbMovieResultSchema.parse(rest)).toThrow();
  });

  it("rejects a poster_path of the wrong type", () => {
    expect(() => tmdbMovieResultSchema.parse({ ...VALID_MOVIE_RESULT, poster_path: 42 })).toThrow();
  });
});

describe("tmdbShowResultSchema", () => {
  const VALID_SHOW_RESULT = {
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
  };

  it("accepts a well-formed show result", () => {
    expect(() => tmdbShowResultSchema.parse(VALID_SHOW_RESULT)).not.toThrow();
  });

  it("accepts a missing adult field — /tv/popular doesn't send one", () => {
    const { adult: _omit, ...rest } = VALID_SHOW_RESULT;
    expect(() => tmdbShowResultSchema.parse(rest)).not.toThrow();
  });
});

describe("tmdbMovieDetailsSchema", () => {
  const VALID_DETAILS = {
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

  it("accepts a well-formed movie details response", () => {
    expect(() => tmdbMovieDetailsSchema.parse(VALID_DETAILS)).not.toThrow();
  });

  it("accepts runtime: 0 (TMDB's 'unknown runtime' sentinel) and a null runtime", () => {
    expect(() => tmdbMovieDetailsSchema.parse({ ...VALID_DETAILS, runtime: 0 })).not.toThrow();
    expect(() => tmdbMovieDetailsSchema.parse({ ...VALID_DETAILS, runtime: null })).not.toThrow();
  });

  it("rejects genres missing a name", () => {
    expect(() =>
      tmdbMovieDetailsSchema.parse({ ...VALID_DETAILS, genres: [{ id: 28 }] }),
    ).toThrow();
  });

  it("accepts a present belongs_to_collection", () => {
    expect(() =>
      tmdbMovieDetailsSchema.parse({
        ...VALID_DETAILS,
        belongs_to_collection: {
          id: 528,
          name: "The Dark Knight Collection",
          poster_path: "/collection-poster.jpg",
          backdrop_path: null,
        },
      }),
    ).not.toThrow();
  });
});

describe("tmdbCollectionDetailsSchema", () => {
  it("accepts a well-formed collection response, reusing the movie result shape for parts", () => {
    const collection = {
      id: 528,
      name: "The Dark Knight Collection",
      parts: [
        {
          id: 272,
          title: "Batman Begins",
          original_title: "Batman Begins",
          overview: "Driven by tragedy...",
          release_date: "2005-06-10",
          poster_path: "/batman-begins.jpg",
          backdrop_path: null,
          vote_average: 7.7,
          vote_count: 20000,
          genre_ids: [28],
          adult: false,
        },
      ],
    };
    expect(() => tmdbCollectionDetailsSchema.parse(collection)).not.toThrow();
  });
});

describe("tmdbSeasonDetailsSchema", () => {
  it("accepts a well-formed season with episodes", () => {
    const season = {
      id: 3624,
      season_number: 1,
      name: "Season 1",
      overview: "The first season.",
      air_date: "2011-04-17",
      poster_path: "/season-poster.jpg",
      episodes: [
        {
          id: 63056,
          episode_number: 1,
          season_number: 1,
          name: "Winter Is Coming",
          overview: "Ned Stark...",
          runtime: 62,
          air_date: "2011-04-17",
          still_path: "/still.jpg",
          vote_average: 8.1,
        },
      ],
    };
    expect(() => tmdbSeasonDetailsSchema.parse(season)).not.toThrow();
  });

  it("preserves season_number 0 (specials) rather than treating it as falsy/missing", () => {
    const result = tmdbSeasonDetailsSchema.parse({
      id: 1,
      season_number: 0,
      name: "Specials",
      overview: "",
      air_date: null,
      poster_path: null,
      episodes: [],
    });
    expect(result.season_number).toBe(0);
  });
});

describe("tmdbCreditsResponseSchema", () => {
  const VALID_CREDITS = {
    cast: [
      {
        id: 819,
        name: "Edward Norton",
        character: "The Narrator",
        profile_path: "/edward.jpg",
        order: 0,
      },
    ],
    crew: [{ id: 7467, name: "David Fincher", job: "Director", department: "Directing" }],
  };

  it("accepts a well-formed credits response", () => {
    expect(() => tmdbCreditsResponseSchema.parse(VALID_CREDITS)).not.toThrow();
  });

  it("accepts a null profile_path", () => {
    expect(() =>
      tmdbCreditsResponseSchema.parse({
        ...VALID_CREDITS,
        cast: [{ ...VALID_CREDITS.cast[0], profile_path: null }],
      }),
    ).not.toThrow();
  });

  it("rejects a cast member missing a field we depend on", () => {
    const { character: _omit, ...rest } = VALID_CREDITS.cast[0] ?? {};
    expect(() => tmdbCreditsResponseSchema.parse({ ...VALID_CREDITS, cast: [rest] })).toThrow();
  });
});

describe("tmdbVideosResponseSchema", () => {
  it("accepts a well-formed videos response", () => {
    const videos = {
      results: [
        {
          id: "5335254f...",
          key: "SUXWAEX2jlg",
          name: "Official Trailer",
          site: "YouTube",
          type: "Trailer",
          official: true,
        },
      ],
    };
    expect(() => tmdbVideosResponseSchema.parse(videos)).not.toThrow();
  });

  it("ignores extra fields (iso_639_1, size, published_at, ...)", () => {
    const result = tmdbVideosResponseSchema.parse({
      results: [
        {
          id: "1",
          key: "abc",
          name: "Trailer",
          site: "YouTube",
          type: "Trailer",
          official: true,
          iso_639_1: "en",
          size: 1080,
          published_at: "2010-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(result.results[0]).not.toHaveProperty("size");
  });
});

describe("tmdbShowDetailsSchema", () => {
  const VALID_SHOW_DETAILS = {
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
    seasons: [],
    created_by: [{ id: 9813, name: "David Benioff" }],
  };

  it("accepts a well-formed show details response", () => {
    expect(() => tmdbShowDetailsSchema.parse(VALID_SHOW_DETAILS)).not.toThrow();
  });

  it("accepts an empty created_by — not every show has a credited creator on file", () => {
    expect(() =>
      tmdbShowDetailsSchema.parse({ ...VALID_SHOW_DETAILS, created_by: [] }),
    ).not.toThrow();
  });

  it("rejects a response missing created_by entirely", () => {
    const { created_by: _omit, ...rest } = VALID_SHOW_DETAILS;
    expect(() => tmdbShowDetailsSchema.parse(rest)).toThrow();
  });
});

describe("tmdbAggregateCreditsResponseSchema", () => {
  it("accepts a well-formed aggregate credits response", () => {
    const credits = {
      cast: [
        {
          id: 22970,
          name: "Peter Dinklage",
          profile_path: "/dinklage.jpg",
          roles: [{ character: "Tyrion Lannister", episode_count: 73 }],
          order: 0,
        },
      ],
    };
    expect(() => tmdbAggregateCreditsResponseSchema.parse(credits)).not.toThrow();
  });

  it("accepts an empty roles array — a crew-only credit surfaced without a role", () => {
    const credits = { cast: [{ id: 1, name: "Someone", profile_path: null, roles: [], order: 0 }] };
    expect(() => tmdbAggregateCreditsResponseSchema.parse(credits)).not.toThrow();
  });

  it("rejects a cast member missing a field we depend on", () => {
    const credits = { cast: [{ id: 1, profile_path: null, roles: [], order: 0 }] };
    expect(() => tmdbAggregateCreditsResponseSchema.parse(credits)).toThrow();
  });
});

describe("tmdbPersonDetailsSchema", () => {
  const VALID_PERSON = {
    id: 525,
    name: "Christopher Nolan",
    biography: "A British-American filmmaker.",
    birthday: "1970-07-30",
    deathday: null,
    place_of_birth: "London, England, UK",
    profile_path: "/nolan.jpg",
    known_for_department: "Directing",
  };

  it("accepts a well-formed person", () => {
    expect(() => tmdbPersonDetailsSchema.parse(VALID_PERSON)).not.toThrow();
  });

  it("accepts nulls for unset birthday/deathday/place_of_birth/profile_path/known_for_department", () => {
    expect(() =>
      tmdbPersonDetailsSchema.parse({
        ...VALID_PERSON,
        birthday: null,
        deathday: null,
        place_of_birth: null,
        profile_path: null,
        known_for_department: null,
      }),
    ).not.toThrow();
  });

  it("ignores unfetched fields (popularity, imdb_id, homepage, ...) rather than rejecting them", () => {
    expect(() =>
      tmdbPersonDetailsSchema.parse({
        ...VALID_PERSON,
        popularity: 42.1,
        imdb_id: "nm0634240",
        homepage: null,
        also_known_as: [],
      }),
    ).not.toThrow();
  });

  it("rejects a person missing a field we depend on", () => {
    const { name: _name, ...withoutName } = VALID_PERSON;
    expect(() => tmdbPersonDetailsSchema.parse(withoutName)).toThrow();
  });
});

describe("tmdbPersonCombinedCreditsResponseSchema", () => {
  it("accepts a well-formed combined credits response", () => {
    const credits = {
      cast: [
        {
          id: 27205,
          media_type: "movie",
          title: "Inception",
          release_date: "2010-07-15",
          poster_path: "/inception.jpg",
          character: "Cobb",
          vote_count: 35000,
        },
      ],
      crew: [
        {
          id: 27205,
          media_type: "movie",
          title: "Inception",
          release_date: "2010-07-15",
          poster_path: "/inception.jpg",
          job: "Director",
          department: "Directing",
        },
      ],
    };
    expect(() => tmdbPersonCombinedCreditsResponseSchema.parse(credits)).not.toThrow();
  });

  it("accepts a tv credit's name/first_air_date/episode_count instead of a movie's title/release_date", () => {
    const credits = {
      cast: [
        {
          id: 1399,
          media_type: "tv",
          name: "Peaky Blinders",
          first_air_date: "2013-09-12",
          poster_path: null,
          character: "Alfie Solomons",
          episode_count: 6,
        },
      ],
      crew: [],
    };
    expect(() => tmdbPersonCombinedCreditsResponseSchema.parse(credits)).not.toThrow();
  });

  it("rejects a credit missing a field we depend on", () => {
    const credits = { cast: [{ media_type: "movie", poster_path: null }], crew: [] };
    expect(() => tmdbPersonCombinedCreditsResponseSchema.parse(credits)).toThrow();
  });
});
