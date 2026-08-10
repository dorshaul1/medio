// Pure headline selection — no I/O, no fabricated copy. Picks the single
// strongest, truthful opening insight (see docs/stats.md, "Hero
// headline"): a genuine most-watched-vs-highest-rated contrast when one
// exists (the flagship "tells you something you didn't already know"
// insight), falling back gracefully as evidence gets thinner. The exact
// English copy lives in the UI layer — this only decides *which claim* is
// truthfully supportable, so that decision is unit-testable.
import type { GenreInsights, PersonTasteStat, TasteHeadline } from "./types";

export function computeTasteHeadline(
  genres: GenreInsights,
  favoriteDirectors: readonly PersonTasteStat[],
): TasteHeadline {
  const topWatched = genres.mostWatched[0];
  const topRated = genres.highestRated[0];

  if (topWatched && topRated && topWatched.genreId !== topRated.genreId) {
    return {
      kind: "contrast",
      mostWatchedGenre: topWatched.genreName,
      highestRatedGenre: topRated.genreName,
    };
  }

  if (topRated) return { kind: "highest_rated_genre", genre: topRated.genreName };
  if (topWatched) return { kind: "most_watched_genre", genre: topWatched.genreName };
  if (favoriteDirectors[0]) return { kind: "favorite_director", name: favoriteDirectors[0].name };
  return { kind: "sparse" };
}
