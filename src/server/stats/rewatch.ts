// Pure rewatch aggregation — no I/O. Operates on already-grouped SQL
// aggregate rows (see aggregates.ts), never raw event rows — see
// docs/stats.md, "Rewatch aggregation" for why this stays a group/count
// operation, never a full event-row scan.
import {
  MIN_REWATCH_INSTANCES_FOR_MOST_REVISITED_SHOW,
  MIN_UNIQUE_TITLES_FOR_REWATCH_RATE,
  MIN_WATCH_COUNT_FOR_MOST_REWATCHED_MOVIE,
} from "./constants";
import type { MovieRewatchAggregate, ShowRewatchAggregate } from "./types";

// Ties broken by most-recent activity, then id — deterministic, never
// order-of-insertion-dependent (see docs/stats.md, "Highest-rated title
// tie"/"Most rewatched movie").
export function findMostRewatchedMovie(
  rows: readonly MovieRewatchAggregate[],
): MovieRewatchAggregate | null {
  const eligible = rows.filter((row) => row.watchCount >= MIN_WATCH_COUNT_FOR_MOST_REWATCHED_MOVIE);
  if (eligible.length === 0) return null;

  return [...eligible].sort(
    (a, b) =>
      b.watchCount - a.watchCount ||
      b.lastWatchedAt.getTime() - a.lastWatchedAt.getTime() ||
      a.movieProviderId - b.movieProviderId,
  )[0] as MovieRewatchAggregate;
}

export function findMostRevisitedShow(
  rows: readonly ShowRewatchAggregate[],
): ShowRewatchAggregate | null {
  const eligible = rows.filter(
    (row) => row.rewatchedEpisodeCount >= MIN_REWATCH_INSTANCES_FOR_MOST_REVISITED_SHOW,
  );
  if (eligible.length === 0) return null;

  return [...eligible].sort(
    (a, b) =>
      b.rewatchedEpisodeCount - a.rewatchedEpisodeCount || a.showProviderId - b.showProviderId,
  )[0] as ShowRewatchAggregate;
}

// Percentage of unique watched titles (movies + meaningfully-watched
// shows) that received at least one rewatch — see docs/stats.md,
// "Rewatch rate". A movie counts as rewatched once watched twice; a show
// counts as rewatched once any one of its episodes has been watched more
// than once. Deliberately not "events beyond first watch / total
// events" — that answers a different question (viewing-volume share, not
// "what fraction of what I watched did I come back to").
export function computeRewatchRatePercent(input: {
  moviesWithRewatch: number;
  showsWithRewatch: number;
  uniqueMoviesWatched: number;
  uniqueShowsWatched: number;
}): number | null {
  const denominator = input.uniqueMoviesWatched + input.uniqueShowsWatched;
  if (denominator < MIN_UNIQUE_TITLES_FOR_REWATCH_RATE) return null;

  const numerator = input.moviesWithRewatch + input.showsWithRewatch;
  return Math.round((numerator / denominator) * 100);
}
