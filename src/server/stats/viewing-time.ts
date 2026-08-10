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
// actual lifetime viewing. Below `MIN_RUNTIME_COVERAGE_RATIO`, the
// estimate is withheld entirely — see docs/stats.md, "Runtime coverage".
import { MIN_RUNTIME_COVERAGE_RATIO } from "./constants";
import type { TasteTitle, ViewingTimeEstimate } from "./types";

export function estimateViewingTime(
  titles: readonly TasteTitle[],
  totalLifetimeEventCount: number,
): ViewingTimeEstimate | null {
  if (totalLifetimeEventCount === 0) return null;

  let coveredMinutes = 0;
  let coveredEvents = 0;

  for (const title of titles) {
    if (title.mediaType === "movie") {
      if (title.runtimeMinutes === null) continue;
      coveredMinutes += title.runtimeMinutes * title.watchCount;
      coveredEvents += title.watchCount;
    } else {
      if (title.episodeRuntimeMinutes === null) continue;
      coveredMinutes += title.episodeRuntimeMinutes * title.totalEpisodeEvents;
      coveredEvents += title.totalEpisodeEvents;
    }
  }

  const coverageRatio = coveredEvents / totalLifetimeEventCount;
  if (coverageRatio < MIN_RUNTIME_COVERAGE_RATIO) return null;

  return { minutes: coveredMinutes, coverageRatio };
}
