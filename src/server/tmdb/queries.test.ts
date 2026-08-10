import { beforeEach, describe, expect, it, vi } from "vitest";

// queries.ts (and its `./client` import) are `server-only` — mocked the
// same way as client.test.ts, scoped to this file, so the query surface
// can be tested without a live TMDB call. Only the client's request
// primitive is mocked; schema validation and mapping run for real.
vi.mock("server-only", () => ({}));
const tmdbFetch = vi.fn();
vi.mock("./client", () => ({ tmdbFetch: (...args: unknown[]) => tmdbFetch(...args) }));

const {
  discoverMoviesByGenre,
  discoverShowsByGenre,
  getCollectionMovies,
  getMovieCredits,
  getMovieGenres,
  getMovieRecommendations,
  getMovieTrailer,
  getNowPlayingMovies,
  getPersonCombinedCredits,
  getPersonDetails,
  getPopularMovies,
  getPopularShows,
  getShowAggregateCredits,
  getShowGenres,
  getShowRecommendations,
  getShowTrailer,
  getTrendingMovies,
  getTrendingShows,
} = await import("./queries");

const MOVIE_RESULT = {
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

const SHOW_RESULT = {
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
  // /tv/popular really doesn't send this — exercised deliberately here.
};

describe("getPopularMovies", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /movie/popular and returns normalized MediaSummary items", async () => {
    tmdbFetch.mockResolvedValueOnce({
      page: 1,
      total_pages: 100,
      total_results: 2000,
      results: [MOVIE_RESULT],
    });

    const result = await getPopularMovies();

    expect(tmdbFetch).toHaveBeenCalledWith(
      "/movie/popular",
      expect.objectContaining({ query: expect.objectContaining({ language: "en-US" }) }),
    );
    expect(result).toEqual([
      expect.objectContaining({ mediaType: "movie", id: 27205, title: "Inception" }),
    ]);
  });

  it("rejects with a TmdbError when the response doesn't match the expected shape", async () => {
    tmdbFetch.mockResolvedValueOnce({ nonsense: true });
    await expect(getPopularMovies()).rejects.toMatchObject({ kind: "invalid_response" });
  });
});

describe("getPopularShows", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /tv/popular and maps a missing adult field to false", async () => {
    tmdbFetch.mockResolvedValueOnce({
      page: 1,
      total_pages: 50,
      total_results: 1000,
      results: [SHOW_RESULT],
    });

    const result = await getPopularShows();

    expect(result).toEqual([
      expect.objectContaining({ mediaType: "show", id: 1399, adult: false }),
    ]);
  });
});

describe("getNowPlayingMovies", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /movie/now_playing and ignores the extra `dates` field TMDB adds", async () => {
    tmdbFetch.mockResolvedValueOnce({
      dates: { maximum: "2026-08-01", minimum: "2026-06-01" },
      page: 1,
      total_pages: 5,
      total_results: 90,
      results: [MOVIE_RESULT],
    });

    const result = await getNowPlayingMovies();

    expect(result).toHaveLength(1);
    expect(tmdbFetch).toHaveBeenCalledWith("/movie/now_playing", expect.anything());
  });
});

describe("getTrendingMovies / getTrendingShows", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /trending/movie/day, kept separate from show trending", async () => {
    tmdbFetch.mockResolvedValueOnce({
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [MOVIE_RESULT],
    });

    const result = await getTrendingMovies();

    expect(tmdbFetch).toHaveBeenCalledWith("/trending/movie/day", expect.anything());
    expect(result).toEqual([expect.objectContaining({ mediaType: "movie" })]);
  });

  it("fetches /trending/tv/day", async () => {
    tmdbFetch.mockResolvedValueOnce({
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [SHOW_RESULT],
    });

    const result = await getTrendingShows();

    expect(tmdbFetch).toHaveBeenCalledWith("/trending/tv/day", expect.anything());
    expect(result).toEqual([expect.objectContaining({ mediaType: "show" })]);
  });
});

describe("getMovieGenres / getShowGenres", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /genre/movie/list and maps to domain Genre objects", async () => {
    tmdbFetch.mockResolvedValueOnce({ genres: [{ id: 35, name: "Comedy" }] });

    await expect(getMovieGenres()).resolves.toEqual([{ id: 35, name: "Comedy" }]);
    expect(tmdbFetch).toHaveBeenCalledWith("/genre/movie/list", expect.anything());
  });

  it("fetches /genre/tv/list — kept separate since movie/tv genre IDs differ", async () => {
    tmdbFetch.mockResolvedValueOnce({ genres: [{ id: 10759, name: "Action & Adventure" }] });

    await expect(getShowGenres()).resolves.toEqual([{ id: 10759, name: "Action & Adventure" }]);
    expect(tmdbFetch).toHaveBeenCalledWith("/genre/tv/list", expect.anything());
  });
});

describe("discoverMoviesByGenre", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
    tmdbFetch.mockResolvedValue({
      page: 1,
      total_pages: 3,
      total_results: 50,
      results: [MOVIE_RESULT],
    });
  });

  it("filters by with_genres and defaults to popularity sort", async () => {
    await discoverMoviesByGenre(35);

    expect(tmdbFetch).toHaveBeenCalledWith(
      "/discover/movie",
      expect.objectContaining({
        query: expect.objectContaining({ with_genres: 35, sort_by: "popularity.desc" }),
      }),
    );
  });

  it("maps 'top_rated' to vote_average.desc with a minimum vote count", async () => {
    await discoverMoviesByGenre(35, { sort: "top_rated" });

    expect(tmdbFetch).toHaveBeenCalledWith(
      "/discover/movie",
      expect.objectContaining({
        query: expect.objectContaining({
          sort_by: "vote_average.desc",
          "vote_count.gte": 100,
        }),
      }),
    );
  });

  it("maps 'newest' to primary_release_date.desc, without a vote count filter", async () => {
    await discoverMoviesByGenre(35, { sort: "newest" });

    const [, options] = tmdbFetch.mock.calls[0] as [string, { query: Record<string, unknown> }];
    expect(options.query.sort_by).toBe("primary_release_date.desc");
    expect(options.query["vote_count.gte"]).toBeUndefined();
  });

  it("returns a Pagination<MediaSummary>", async () => {
    const result = await discoverMoviesByGenre(35);
    expect(result).toEqual({
      page: 1,
      totalPages: 3,
      totalResults: 50,
      items: [expect.objectContaining({ mediaType: "movie" })],
    });
  });
});

describe("discoverShowsByGenre", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
    tmdbFetch.mockResolvedValue({
      page: 1,
      total_pages: 2,
      total_results: 30,
      results: [SHOW_RESULT],
    });
  });

  it("maps 'newest' to first_air_date.desc — a different field than movies", async () => {
    await discoverShowsByGenre(18, { sort: "newest" });

    expect(tmdbFetch).toHaveBeenCalledWith(
      "/discover/tv",
      expect.objectContaining({
        query: expect.objectContaining({ sort_by: "first_air_date.desc" }),
      }),
    );
  });
});

describe("getMovieCredits", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /movie/{id}/credits and returns normalized cast/directors", async () => {
    tmdbFetch.mockResolvedValueOnce({
      cast: [
        {
          id: 819,
          name: "Edward Norton",
          character: "The Narrator",
          profile_path: "/e.jpg",
          order: 0,
        },
      ],
      crew: [{ id: 7467, name: "David Fincher", job: "Director", department: "Directing" }],
    });

    const result = await getMovieCredits(550);

    expect(tmdbFetch).toHaveBeenCalledWith("/movie/550/credits", expect.anything());
    expect(result.cast).toHaveLength(1);
    expect(result.directors).toEqual([{ id: 7467, name: "David Fincher" }]);
  });
});

describe("getMovieTrailer", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /movie/{id}/videos and returns the selected trailer", async () => {
    tmdbFetch.mockResolvedValueOnce({
      results: [
        {
          id: "1",
          key: "abc123",
          name: "Official Trailer",
          site: "YouTube",
          type: "Trailer",
          official: true,
        },
      ],
    });

    const result = await getMovieTrailer(550);

    expect(tmdbFetch).toHaveBeenCalledWith("/movie/550/videos", expect.anything());
    expect(result).toEqual({ key: "abc123", name: "Official Trailer" });
  });

  it("returns null when there's no suitable video — not an error", async () => {
    tmdbFetch.mockResolvedValueOnce({ results: [] });
    await expect(getMovieTrailer(550)).resolves.toBeNull();
  });
});

describe("getMovieRecommendations", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /movie/{id}/recommendations and maps to MediaSummary items", async () => {
    tmdbFetch.mockResolvedValueOnce({
      page: 1,
      total_pages: 5,
      total_results: 100,
      results: [MOVIE_RESULT],
    });

    const result = await getMovieRecommendations(550);

    expect(tmdbFetch).toHaveBeenCalledWith("/movie/550/recommendations", expect.anything());
    expect(result).toEqual([expect.objectContaining({ mediaType: "movie", id: 27205 })]);
  });
});

describe("getCollectionMovies", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /collection/{id} and maps its parts to MediaSummary items", async () => {
    tmdbFetch.mockResolvedValueOnce({
      id: 528,
      name: "The Dark Knight Collection",
      parts: [MOVIE_RESULT],
    });

    const result = await getCollectionMovies(528);

    expect(tmdbFetch).toHaveBeenCalledWith("/collection/528", expect.anything());
    expect(result).toEqual([expect.objectContaining({ mediaType: "movie", id: 27205 })]);
  });
});

describe("getShowAggregateCredits", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /tv/{id}/aggregate_credits and returns normalized cast", async () => {
    tmdbFetch.mockResolvedValueOnce({
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

    const result = await getShowAggregateCredits(1399);

    expect(tmdbFetch).toHaveBeenCalledWith("/tv/1399/aggregate_credits", expect.anything());
    expect(result.cast).toEqual([
      {
        id: 22970,
        name: "Peter Dinklage",
        character: "Tyrion Lannister",
        profile: { path: "/dinklage.jpg" },
      },
    ]);
  });
});

describe("getShowTrailer", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /tv/{id}/videos and returns the selected trailer", async () => {
    tmdbFetch.mockResolvedValueOnce({
      results: [
        {
          id: "1",
          key: "abc123",
          name: "Official Trailer",
          site: "YouTube",
          type: "Trailer",
          official: true,
        },
      ],
    });

    const result = await getShowTrailer(1399);

    expect(tmdbFetch).toHaveBeenCalledWith("/tv/1399/videos", expect.anything());
    expect(result).toEqual({ key: "abc123", name: "Official Trailer" });
  });

  it("returns null when there's no suitable video — not an error", async () => {
    tmdbFetch.mockResolvedValueOnce({ results: [] });
    await expect(getShowTrailer(1399)).resolves.toBeNull();
  });
});

describe("getShowRecommendations", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /tv/{id}/recommendations and maps to MediaSummary items", async () => {
    tmdbFetch.mockResolvedValueOnce({
      page: 1,
      total_pages: 5,
      total_results: 100,
      results: [SHOW_RESULT],
    });

    const result = await getShowRecommendations(1399);

    expect(tmdbFetch).toHaveBeenCalledWith("/tv/1399/recommendations", expect.anything());
    expect(result).toEqual([expect.objectContaining({ mediaType: "show", id: 1399 })]);
  });
});

describe("getPersonDetails", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /person/{id} and returns a normalized Person", async () => {
    tmdbFetch.mockResolvedValueOnce({
      id: 525,
      name: "Christopher Nolan",
      biography: "A British-American filmmaker.",
      birthday: "1970-07-30",
      deathday: null,
      place_of_birth: "London, England, UK",
      profile_path: "/nolan.jpg",
      known_for_department: "Directing",
    });

    const result = await getPersonDetails(525);

    expect(tmdbFetch).toHaveBeenCalledWith("/person/525", expect.anything());
    expect(result).toEqual(
      expect.objectContaining({
        id: 525,
        name: "Christopher Nolan",
        knownForDepartment: "Directing",
      }),
    );
  });

  it("rejects with a TmdbError when the response doesn't match the expected shape", async () => {
    tmdbFetch.mockResolvedValueOnce({ nonsense: true });
    await expect(getPersonDetails(525)).rejects.toMatchObject({ kind: "invalid_response" });
  });
});

describe("getPersonCombinedCredits", () => {
  beforeEach(() => {
    tmdbFetch.mockReset();
  });

  it("fetches /person/{id}/combined_credits and returns normalized cast/crew", async () => {
    tmdbFetch.mockResolvedValueOnce({
      cast: [
        {
          id: 27205,
          media_type: "movie",
          title: "Inception",
          release_date: "2010-07-15",
          poster_path: "/inception.jpg",
          character: "Cobb",
        },
      ],
      crew: [
        {
          id: 157336,
          media_type: "movie",
          title: "Interstellar",
          release_date: "2014-11-05",
          poster_path: "/interstellar.jpg",
          job: "Director",
          department: "Directing",
        },
      ],
    });

    const result = await getPersonCombinedCredits(525);

    expect(tmdbFetch).toHaveBeenCalledWith("/person/525/combined_credits", expect.anything());
    expect(result.cast).toEqual([
      expect.objectContaining({ title: "Inception", character: "Cobb" }),
    ]);
    expect(result.crew).toEqual([
      expect.objectContaining({ title: "Interstellar", job: "Director" }),
    ]);
  });
});
