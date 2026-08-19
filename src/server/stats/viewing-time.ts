// Pure viewing-time estimation — no I/O. See docs/stats.md, "Viewing
// time". A movie contributes `runtimeMinutes × watchCount` (every
// viewing, rewatches included — a movie watched three times really was
// watched three times). A show contributes its own typical
// `episodeRuntimeMinutes × totalEpisodeEvents` — a single approximate
// per-episode figure applied to every episode event for that show, not a
// true per-episode runtime (see docs/stats.md for why this is an
// accepted, documented approximation rather than a per-episode fetch).
//
// Coverage is measured in *events*, not titles: a title with a known
// runtime that's been watched many times should count for more than one
// watched once, since it represents proportionally more of the user's
// actual lifetime viewing. The combined estimate is withheld entirely
// below `MIN_RUNTIME_COVERAGE_RATIO` — see docs/stats.md, "Runtime
// coverage". The Movies-only and Shows-only breakdowns each clear that
// exact same bar independently, against their own lifetime event count —
// a user with excellent movie-runtime coverage but many shows with an
// unknown typical episode runtime gets a trustworthy Movies figure and a
// withheld Shows figure, never a Shows number invented from thin
// evidence just because the *combined* figure happened to qualify.
import { MIN_RUNTIME_COVERAGE_RATIO } from "./constants";
import type { TasteTitle, ViewingTimeEstimate } from "./types";

export function estimateViewingTime(
  titles: readonly TasteTitle[],
  totalMovieEventCount: number,
  totalEpisodeEventCount: number,
): ViewingTimeEstimate | null {
  const totalEventCount = totalMovieEventCount + totalEpisodeEventCount;
  if (totalEventCount === 0) return null;

  let movieMinutes = 0;
  let movieCoveredEvents = 0;
  let showMinutes = 0;
  let showCoveredEvents = 0;

  for (const title of titles) {
    if (title.mediaType === "movie") {
      if (title.runtimeMinutes === null) continue;
      movieMinutes += title.runtimeMinutes * title.watchCount;
      movieCoveredEvents += title.watchCount;
    } else {
      if (title.episodeRuntimeMinutes === null) continue;
      showMinutes += title.episodeRuntimeMinutes * title.totalEpisodeEvents;
      showCoveredEvents += title.totalEpisodeEvents;
    }
  }

  const coverageRatio = (movieCoveredEvents + showCoveredEvents) / totalEventCount;
  if (coverageRatio < MIN_RUNTIME_COVERAGE_RATIO) return null;

  const movieCoverageRatio = totalMovieEventCount > 0 ? movieCoveredEvents / totalMovieEventCount : 0;
  const showCoverageRatio =
    totalEpisodeEventCount > 0 ? showCoveredEvents / totalEpisodeEventCount : 0;

  return {
    minutes: movieMinutes + showMinutes,
    coverageRatio,
    movieMinutes: movieCoverageRatio >= MIN_RUNTIME_COVERAGE_RATIO ? movieMinutes : null,
    showMinutes: showCoverageRatio >= MIN_RUNTIME_COVERAGE_RATIO ? showMinutes : null,
  };
}
