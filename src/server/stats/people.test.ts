import { describe, expect, it } from "vitest";
import { computeFavoriteActors, computeFavoriteDirectors } from "./people";
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

const NOLAN = { id: 525, name: "Christopher Nolan" };
const FINCHER = { id: 7467, name: "David Fincher" };
const ACTOR_A = { id: 819, name: "Actor A", profile: null };
const ACTOR_B = { id: 287, name: "Actor B", profile: null };

describe("computeFavoriteDirectors", () => {
  it("requires at least two rated titles by the same director", () => {
    const titles: readonly TasteTitle[] = [movie({ directors: [NOLAN], rating: 5 })];
    expect(computeFavoriteDirectors(titles)).toEqual([]);
  });

  it("surfaces a director with two or more rated titles, averaging their ratings", () => {
    const titles: readonly TasteTitle[] = [
      movie({ directors: [NOLAN], rating: 5 }),
      movie({ directors: [NOLAN], rating: 3 }),
    ];
    const [director] = computeFavoriteDirectors(titles);
    expect(director?.personId).toBe(NOLAN.id);
    expect(director?.ratedTitleCount).toBe(2);
    expect(director?.averageRating).toBe(4);
  });

  it("ranks by average rating first, with rated-title count as a deterministic tie-breaker", () => {
    const titles: readonly TasteTitle[] = [
      movie({ directors: [NOLAN], rating: 4 }),
      movie({ directors: [NOLAN], rating: 4 }),
      movie({ directors: [FINCHER], rating: 5 }),
      movie({ directors: [FINCHER], rating: 3 }),
    ];
    // Both average 4 — Nolan has more rated titles, so wins the tie.
    const [top] = computeFavoriteDirectors(titles);
    expect(top?.personId).toBe(NOLAN.id);
  });

  it("never uses an unrated title's director", () => {
    const titles: readonly TasteTitle[] = [
      movie({ directors: [NOLAN], rating: 5 }),
      movie({ directors: [NOLAN], rating: null }),
    ];
    expect(computeFavoriteDirectors(titles)).toEqual([]);
  });

  it("ignores Show director-shaped data — directors are Movie-focused this phase", () => {
    const titles: readonly TasteTitle[] = [
      show({ creators: [NOLAN], rating: 5 }),
      show({ creators: [NOLAN], rating: 5 }),
    ];
    expect(computeFavoriteDirectors(titles)).toEqual([]);
  });
});

describe("computeFavoriteActors", () => {
  it("requires at least two rated titles featuring the same actor", () => {
    const titles: readonly TasteTitle[] = [movie({ cast: [ACTOR_A], rating: 5 })];
    expect(computeFavoriteActors(titles)).toEqual([]);
  });

  it("combines Movie and Show participation for the same actor", () => {
    const titles: readonly TasteTitle[] = [
      movie({ cast: [ACTOR_A], rating: 4 }),
      show({ cast: [ACTOR_A], rating: 5 }),
    ];
    const [actor] = computeFavoriteActors(titles);
    expect(actor?.personId).toBe(ACTOR_A.id);
    expect(actor?.ratedTitleCount).toBe(2);
  });

  it("counts a duplicate cast credit within one title only once", () => {
    const titles: readonly TasteTitle[] = [
      movie({ cast: [ACTOR_A, ACTOR_A], rating: 5 }),
      movie({ cast: [ACTOR_A], rating: 3 }),
    ];
    const [actor] = computeFavoriteActors(titles);
    expect(actor?.ratedTitleCount).toBe(2);
    expect(actor?.averageRating).toBe(4);
  });

  it("does not let TMDB popularity influence ranking — only ratings/exposure decide order", () => {
    const titles: readonly TasteTitle[] = [
      movie({ cast: [ACTOR_A], rating: 3 }),
      movie({ cast: [ACTOR_A], rating: 3 }),
      movie({ cast: [ACTOR_B], rating: 5 }),
      movie({ cast: [ACTOR_B], rating: 5 }),
    ];
    const [top] = computeFavoriteActors(titles);
    expect(top?.personId).toBe(ACTOR_B.id);
  });
});
