// Pure headline selection — no I/O, no fabricated copy. Picks the single
// strongest, truthful opening insight (see docs/stats.md, "Hero
// headline"): the user's most-watched genre when there's enough evidence
// for one, falling back gracefully as evidence gets thinner. The exact
// English copy lives in the UI layer — this only decides *which claim* is
// truthfully supportable, so that decision is unit-testable.
import type { GenreInsights, PersonTasteStat, TasteHeadline } from "./types";

export function computeTasteHeadline(
  genres: GenreInsights,
  favoriteDirectors: readonly PersonTasteStat[],
  favoriteActors: readonly PersonTasteStat[],
): TasteHeadline {
  const topWatched = genres.mostWatched[0];
  if (topWatched) return { kind: "most_watched_genre", genre: topWatched.genreName };
  if (favoriteDirectors[0]) return { kind: "favorite_director", name: favoriteDirectors[0].name };
  if (favoriteActors[0]) return { kind: "favorite_actor", name: favoriteActors[0].name };
  return { kind: "sparse" };
}
