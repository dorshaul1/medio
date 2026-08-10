import { describe, expect, it } from "vitest";
import { findGenreBySlug, genreSlug, selectCuratedGenres } from "./genre-selection";

const ALL_MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
];

describe("selectCuratedGenres", () => {
  it("filters to the curated names, in curated order", () => {
    const result = selectCuratedGenres(ALL_MOVIE_GENRES, ["Drama", "Action", "Comedy"]);
    expect(result).toEqual([
      { id: 18, name: "Drama" },
      { id: 28, name: "Action" },
      { id: 35, name: "Comedy" },
    ]);
  });

  it("silently skips a curated name TMDB doesn't currently have, rather than inventing it", () => {
    const result = selectCuratedGenres(ALL_MOVIE_GENRES, ["Action", "Fantasy"]);
    expect(result).toEqual([{ id: 28, name: "Action" }]);
  });
});

describe("genreSlug", () => {
  it("lowercases and hyphenates a simple name", () => {
    expect(genreSlug("Action")).toBe("action");
  });

  it("hyphenates multi-word names", () => {
    expect(genreSlug("Science Fiction")).toBe("science-fiction");
  });

  it("expands & to 'and' rather than dropping it", () => {
    expect(genreSlug("Sci-Fi & Fantasy")).toBe("sci-fi-and-fantasy");
    expect(genreSlug("Action & Adventure")).toBe("action-and-adventure");
  });
});

describe("findGenreBySlug", () => {
  it("finds the matching genre by its derived slug", () => {
    expect(findGenreBySlug(ALL_MOVIE_GENRES, "science-fiction")).toBeUndefined();
    expect(findGenreBySlug(ALL_MOVIE_GENRES, "drama")).toEqual({ id: 18, name: "Drama" });
  });

  it("returns undefined for an unknown slug", () => {
    expect(findGenreBySlug(ALL_MOVIE_GENRES, "not-a-real-genre")).toBeUndefined();
  });
});
