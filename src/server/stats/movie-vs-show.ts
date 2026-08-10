// Pure Movie vs Show comparison — no I/O. Deliberately based on unique
// *titles*, never viewing events (a movie viewing and an episode viewing
// aren't comparable units — see docs/stats.md, "Movie vs Show
// comparison semantics"). Only one clearly-labeled comparison is ever
// computed, so there's nothing to silently mix.
import { MIN_UNIQUE_TITLES_FOR_MOVIE_VS_SHOW } from "./constants";
import type { MovieVsShowInsight } from "./types";

export function computeMovieVsShowInsight(
  uniqueMoviesWatched: number,
  uniqueShowsWatched: number,
): MovieVsShowInsight {
  const totalTitles = uniqueMoviesWatched + uniqueShowsWatched;
  if (totalTitles < MIN_UNIQUE_TITLES_FOR_MOVIE_VS_SHOW) return null;

  const moviePercent = Math.round((uniqueMoviesWatched / totalTitles) * 100);
  return { moviePercent, showPercent: 100 - moviePercent, totalTitles };
}
