// Pure genre aggregation — no I/O. See docs/stats.md, "Genre aggregation
// semantics". A title with multiple genres contributes fully to each of
// them (a simple, consistently-applied full count, not fractional
// attribution — see docs/stats.md). Movies and eligible Shows each
// contribute exactly one unit of "watched" per genre, regardless of
// episode count — `TasteTitle` is already title-level by construction
// (see hydrate.ts), so this file never has to know about episodes at all.
import {
  MAX_GENRE_INSIGHTS,
  MIN_TOTAL_TITLES_FOR_GENRE_INSIGHT,
  MIN_WATCHED_TITLES_FOR_GENRE,
} from "./constants";
import type { GenreInsights, TasteTitle } from "./types";

export function computeGenreInsights(titles: readonly TasteTitle[]): GenreInsights {
  if (titles.length < MIN_TOTAL_TITLES_FOR_GENRE_INSIGHT) {
    return { mostWatched: [] };
  }

  const exposure = new Map<number, { name: string; count: number }>();
  for (const title of titles) {
    for (const genre of title.genres) {
      const existing = exposure.get(genre.id);
      if (existing) existing.count += 1;
      else exposure.set(genre.id, { name: genre.name, count: 1 });
    }
  }

  const mostWatched = [...exposure.entries()]
    .map(([genreId, value]) => ({ genreId, genreName: value.name, titleCount: value.count }))
    .filter((genre) => genre.titleCount >= MIN_WATCHED_TITLES_FOR_GENRE)
    .sort((a, b) => b.titleCount - a.titleCount || a.genreName.localeCompare(b.genreName))
    .slice(0, MAX_GENRE_INSIGHTS);

  return { mostWatched };
}
