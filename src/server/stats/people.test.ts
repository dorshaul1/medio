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
  it("requires at least two titles by the same director", () => {
    const titles: readonly TasteTitle[] = [movie({ directors: [NOLAN] })];
    expect(computeFavoriteDirectors(titles)).toEqual([]);
  });

  it("surfaces a director with two or more titles, counting appearances", () => {
    const titles: readonly TasteTitle[] = [
      movie({ directors: [NOLAN] }),
      movie({ directors: [NOLAN] }),
    ];
    const [director] = computeFavoriteDirectors(titles);
    expect(director?.personId).toBe(NOLAN.id);
    expect(director?.titleCount).toBe(2);
  });

  it("ranks by title count first, with name as a deterministic tie-breaker", () => {
    const titles: readonly TasteTitle[] = [
      movie({ directors: [NOLAN] }),
      movie({ directors: [NOLAN] }),
      movie({ directors: [NOLAN] }),
      movie({ directors: [FINCHER] }),
      movie({ directors: [FINCHER] }),
    ];
    const [top] = computeFavoriteDirectors(titles);
    expect(top?.personId).toBe(NOLAN.id);
  });

  it("ignores Show director-shaped data — directors are Movie-focused this phase", () => {
    const titles: readonly TasteTitle[] = [
      show({ creators: [NOLAN] }),
      show({ creators: [NOLAN] }),
    ];
    expect(computeFavoriteDirectors(titles)).toEqual([]);
  });
});

describe("computeFavoriteActors", () => {
  it("requires at least two titles featuring the same actor", () => {
    const titles: readonly TasteTitle[] = [movie({ cast: [ACTOR_A] })];
    expect(computeFavoriteActors(titles)).toEqual([]);
  });

  it("combines Movie and Show participation for the same actor", () => {
    const titles: readonly TasteTitle[] = [movie({ cast: [ACTOR_A] }), show({ cast: [ACTOR_A] })];
    const [actor] = computeFavoriteActors(titles);
    expect(actor?.personId).toBe(ACTOR_A.id);
    expect(actor?.titleCount).toBe(2);
  });

  it("counts a duplicate cast credit within one title only once", () => {
    const titles: readonly TasteTitle[] = [
      movie({ cast: [ACTOR_A, ACTOR_A] }),
      movie({ cast: [ACTOR_A] }),
    ];
    const [actor] = computeFavoriteActors(titles);
    expect(actor?.titleCount).toBe(2);
  });

  it("does not let TMDB popularity influence ranking — only exposure decides order", () => {
    const titles: readonly TasteTitle[] = [
      movie({ cast: [ACTOR_A] }),
      movie({ cast: [ACTOR_A] }),
      movie({ cast: [ACTOR_B] }),
      movie({ cast: [ACTOR_B] }),
      movie({ cast: [ACTOR_B] }),
    ];
    const [top] = computeFavoriteActors(titles);
    expect(top?.personId).toBe(ACTOR_B.id);
  });
});
