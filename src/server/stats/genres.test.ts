import { describe, expect, it } from "vitest";
import { computeGenreInsights } from "./genres";
import type { TasteMovieTitle, TasteShowTitle, TasteTitle } from "./types";

let nextId = 1;

function movie(overrides: Partial<TasteMovieTitle> = {}): TasteMovieTitle {
  const id = nextId++;
  return {
    mediaType: "movie",
    mediaProviderId: id,
    title: `Movie ${id}`,
    poster: null,
    year: 2020,
    genres: [],
    rating: null,
    lastActivityAt: new Date("2024-01-01"),
    cast: [],
    watchCount: 1,
    runtimeMinutes: null,
    directors: [],
    ...overrides,
  };
}

function show(overrides: Partial<TasteShowTitle> = {}): TasteShowTitle {
  const id = nextId++;
  return {
    mediaType: "show",
    mediaProviderId: id,
    title: `Show ${id}`,
    poster: null,
    year: 2020,
    genres: [],
    rating: null,
    lastActivityAt: new Date("2024-01-01"),
    cast: [],
    watchedEpisodeCount: 5,
    rewatchedEpisodeCount: 0,
    creators: [],
    episodeRuntimeMinutes: null,
    totalEpisodeEvents: 0,
    ...overrides,
  };
}

const DRAMA = { id: 1, name: "Drama" };
const THRILLER = { id: 2, name: "Thriller" };
const SCI_FI = { id: 3, name: "Sci-Fi" };

describe("computeGenreInsights", () => {
  it("returns nothing at all when the user has too few total titles", () => {
    const titles: readonly TasteTitle[] = [
      movie({ genres: [DRAMA], rating: 5 }),
      movie({ genres: [DRAMA], rating: 5 }),
    ];
    const insights = computeGenreInsights(titles);
    expect(insights.mostWatched).toEqual([]);
    expect(insights.highestRated).toEqual([]);
  });

  it("counts a title with multiple genres toward each genre", () => {
    const titles: readonly TasteTitle[] = [
      movie({ genres: [DRAMA, THRILLER] }),
      movie({ genres: [DRAMA] }),
      show({ genres: [THRILLER] }),
    ];
    const insights = computeGenreInsights(titles);
    const drama = insights.mostWatched.find((g) => g.genreId === DRAMA.id);
    const thriller = insights.mostWatched.find((g) => g.genreId === THRILLER.id);
    expect(drama?.titleCount).toBe(2);
    expect(thriller?.titleCount).toBe(2);
  });

  it("never inflates a Show's genre title count by its episode count", () => {
    // A Show contributes exactly one unit of "watched" per genre,
    // regardless of how many episodes were watched — see docs/stats.md,
    // "Movie vs Show genre weight".
    const titles: readonly TasteTitle[] = [
      show({ genres: [DRAMA], watchedEpisodeCount: 62 }),
      movie({ genres: [DRAMA] }),
      movie({ genres: [THRILLER] }),
    ];
    const insights = computeGenreInsights(titles);
    const drama = insights.mostWatched.find((g) => g.genreId === DRAMA.id);
    expect(drama?.titleCount).toBe(2);
  });

  it("omits a genre from most-watched below the minimum watched-title threshold", () => {
    const titles: readonly TasteTitle[] = [
      movie({ genres: [DRAMA] }),
      movie({ genres: [THRILLER] }),
      movie({ genres: [THRILLER] }),
    ];
    const insights = computeGenreInsights(titles);
    expect(insights.mostWatched.some((g) => g.genreId === DRAMA.id)).toBe(false);
    expect(insights.mostWatched.some((g) => g.genreId === THRILLER.id)).toBe(true);
  });

  it("requires a minimum rated-title sample before ranking a highest-rated genre", () => {
    // One 5-star Sci-Fi title must not beat a well-established genre —
    // see docs/stats.md, "Statistical reliability".
    const titles: readonly TasteTitle[] = [
      movie({ genres: [SCI_FI], rating: 5 }),
      movie({ genres: [DRAMA], rating: 4 }),
      movie({ genres: [DRAMA], rating: 4 }),
      movie({ genres: [DRAMA], rating: 4 }),
      movie({ genres: [THRILLER] }), // unrated, keeps total-title threshold satisfied
    ];
    const insights = computeGenreInsights(titles);
    expect(insights.highestRated.some((g) => g.genreId === SCI_FI.id)).toBe(false);
    expect(insights.highestRated[0]?.genreId).toBe(DRAMA.id);
  });

  it("ranks highest-rated genres by average rating, not appearance count", () => {
    const titles: readonly TasteTitle[] = [
      movie({ genres: [SCI_FI], rating: 5 }),
      movie({ genres: [SCI_FI], rating: 5 }),
      movie({ genres: [DRAMA], rating: 2 }),
      movie({ genres: [DRAMA], rating: 3 }),
      movie({ genres: [DRAMA], rating: 3 }),
      movie({ genres: [DRAMA], rating: 2 }),
    ];
    const insights = computeGenreInsights(titles);
    expect(insights.highestRated[0]?.genreId).toBe(SCI_FI.id);
  });

  it("counts a title's rating once per genre it carries, never doubled within one genre", () => {
    const titles: readonly TasteTitle[] = [
      movie({ genres: [DRAMA, THRILLER], rating: 5 }),
      movie({ genres: [DRAMA], rating: 5 }),
      movie({ genres: [THRILLER], rating: 1 }),
    ];
    const insights = computeGenreInsights(titles);
    const drama = insights.highestRated.find((g) => g.genreId === DRAMA.id);
    expect(drama?.ratedTitleCount).toBe(2);
    expect(drama?.averageRating).toBe(5);
  });

  it("handles a title with a missing genre gracefully", () => {
    const titles: readonly TasteTitle[] = [
      movie({ genres: [] }),
      movie({ genres: [DRAMA] }),
      movie({ genres: [DRAMA] }),
    ];
    expect(() => computeGenreInsights(titles)).not.toThrow();
  });
});
