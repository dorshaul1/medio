import { describe, expect, it } from "vitest";
import { computeTasteHeadline } from "./headline";
import type { GenreInsights, PersonTasteStat } from "./types";

const noGenres: GenreInsights = { mostWatched: [] };

describe("computeTasteHeadline", () => {
  it("leads with the most-watched genre when one is eligible", () => {
    const genres: GenreInsights = {
      mostWatched: [{ genreId: 1, genreName: "Comedy", titleCount: 6 }],
    };
    expect(computeTasteHeadline(genres, [], [])).toEqual({
      kind: "most_watched_genre",
      genre: "Comedy",
    });
  });

  it("falls back to a favorite director when no genre insight is eligible yet", () => {
    const directors: PersonTasteStat[] = [
      { personId: 1, name: "Denis Villeneuve", titleCount: 2, profile: null },
    ];
    expect(computeTasteHeadline(noGenres, directors, [])).toEqual({
      kind: "favorite_director",
      name: "Denis Villeneuve",
    });
  });

  it("falls back to a favorite actor when no genre or director insight is eligible yet", () => {
    const actors: PersonTasteStat[] = [
      { personId: 2, name: "Zendaya", titleCount: 3, profile: null },
    ];
    expect(computeTasteHeadline(noGenres, [], actors)).toEqual({
      kind: "favorite_actor",
      name: "Zendaya",
    });
  });

  it("never fabricates an insight for a sparse profile", () => {
    expect(computeTasteHeadline(noGenres, [], [])).toEqual({ kind: "sparse" });
  });
});
