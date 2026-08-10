import { describe, expect, it } from "vitest";
import { computeTasteHeadline } from "./headline";
import type { GenreInsights, PersonTasteStat } from "./types";

const noGenres: GenreInsights = { mostWatched: [], highestRated: [] };

describe("computeTasteHeadline", () => {
  it("leads with the contrast when most-watched and highest-rated genres differ", () => {
    const genres: GenreInsights = {
      mostWatched: [{ genreId: 1, genreName: "Drama", titleCount: 10 }],
      highestRated: [{ genreId: 2, genreName: "Sci-Fi", averageRating: 4.8, ratedTitleCount: 3 }],
    };
    expect(computeTasteHeadline(genres, [])).toEqual({
      kind: "contrast",
      mostWatchedGenre: "Drama",
      highestRatedGenre: "Sci-Fi",
    });
  });

  it("falls back to the highest-rated genre alone when it matches the most-watched genre", () => {
    const genres: GenreInsights = {
      mostWatched: [{ genreId: 1, genreName: "Drama", titleCount: 10 }],
      highestRated: [{ genreId: 1, genreName: "Drama", averageRating: 4.2, ratedTitleCount: 4 }],
    };
    expect(computeTasteHeadline(genres, [])).toEqual({
      kind: "highest_rated_genre",
      genre: "Drama",
    });
  });

  it("falls back to most-watched genre when no rating signal exists yet", () => {
    const genres: GenreInsights = {
      mostWatched: [{ genreId: 1, genreName: "Comedy", titleCount: 6 }],
      highestRated: [],
    };
    expect(computeTasteHeadline(genres, [])).toEqual({
      kind: "most_watched_genre",
      genre: "Comedy",
    });
  });

  it("falls back to a favorite director when no genre insight is eligible yet", () => {
    const directors: PersonTasteStat[] = [
      {
        personId: 1,
        name: "Denis Villeneuve",
        ratedTitleCount: 2,
        averageRating: 5,
        profile: null,
      },
    ];
    expect(computeTasteHeadline(noGenres, directors)).toEqual({
      kind: "favorite_director",
      name: "Denis Villeneuve",
    });
  });

  it("never fabricates an insight for a sparse profile", () => {
    expect(computeTasteHeadline(noGenres, [])).toEqual({ kind: "sparse" });
  });
});
