import "server-only";
import { requireSession } from "@/server/auth/session";
import { getPersonDetails } from "@/server/tmdb/queries";
import {
  getActiveStatsYears,
  getTrackingStateCounts,
  getViewingTimestampsInRange,
  getViewingVolume,
  getYearlyActivityCounts,
} from "./aggregates";
import { getMovieWatchAggregates, getShowWatchAggregates } from "./candidates";
import { deriveStatsComparison } from "./compare";
import { computeCompletionInsight } from "./completion";
import {
  MIN_EVENTS_FOR_WEEKDAY_INSIGHT,
  STATS_TIMELINE_MONTHS,
  TASTE_CREDITS_HYDRATION_LIMIT,
  TASTE_RECENT_MOVIE_HYDRATION_LIMIT,
  TASTE_RECENT_SHOW_HYDRATION_LIMIT,
} from "./constants";
import { computeGenreInsights } from "./genres";
import { computeTasteHeadline } from "./headline";
import { hydrateTasteTitles } from "./hydrate";
import { selectHydrationIds } from "./hydration-selection";
import { computeMovieVsShowInsight } from "./movie-vs-show";
import { computeFavoriteActors, computeFavoriteDirectors } from "./people";
import {
  formatStatsRangeLabel,
  resolvePreviousStatsRangeBounds,
  resolveStatsRangeBounds,
  type StatsRange,
  type StatsRangeBounds,
  statsRangeSupportsComparison,
} from "./range";
import {
  computeRewatchRatePercent,
  findMostRevisitedShow,
  findMostRewatchedMovie,
} from "./rewatch";
import {
  computeDailyActivity,
  computeMonthlyActivity,
  computeWeekdayActivity,
  computeYearlyActivity,
  toActivityBuckets,
} from "./timeline";
import type {
  MostRevisitedShow,
  MostRewatchedMovie,
  PersonTasteStat,
  StatsComparison,
  StatsProfile,
  TasteTitle,
  ViewingRhythm,
  WeekdayRhythm,
} from "./types";
import { estimateViewingTime } from "./viewing-time";

// The one server entrypoint this whole domain exists to produce — see
// docs/stats.md. Owns the session boundary (same layering as
// `getLibraryPage`/`getDiaryPage`): every lower-level query in this
// directory is explicitly `userId`-scoped, never session-aware itself.
//
// Everything returned here is *derived* at request time from
// user-owned facts (tracking events) plus normalized provider metadata —
// nothing here is ever written back to Postgres (see CLAUDE.md, "Stats
// is derived...").

function findHydratedTitle(
  titles: readonly TasteTitle[],
  mediaType: "movie" | "show",
  mediaProviderId: number,
): TasteTitle | undefined {
  return titles.find(
    (title) => title.mediaType === mediaType && title.mediaProviderId === mediaProviderId,
  );
}

// Actors' portraits already come from the per-title credits fetch used
// for ranking (see hydrate.ts) — only directors need this small, final,
// bounded hydration pass (at most MAX_FAVORITE_DIRECTORS requests,
// already-cached 24h `getPersonDetails`, same as any Person page visit).
// A failure for one person never drops them from the list — the name/
// ranking stands regardless of whether a portrait loads.
async function hydrateDirectorPortraits(
  directors: readonly PersonTasteStat[],
): Promise<readonly PersonTasteStat[]> {
  return Promise.all(
    directors.map(async (director) => {
      try {
        const person = await getPersonDetails(director.personId);
        return { ...director, profile: person.profile };
      } catch {
        return director;
      }
    }),
  );
}

// The viewing-rhythm chart's granularity follows the selected range (see
// docs/stats.md, "Viewing rhythm and range") — never a 10-year, 120-
// column monthly chart, and never a meaningless 12-month chart for one
// selected month:
// - "month": bucketed by day, within that one month.
// - "year"/"last12months": bucketed by month — exactly the existing
//   12-entry chart, reusing `computeMonthlyActivity` unchanged (a
//   specific past year's Jan-Dec is the trailing-12-months window ending
//   at that year's own January 1st of the *next* year).
// - "all": bucketed by real calendar year, from one bounded SQL
//   aggregate (`getYearlyActivityCounts`) — never a raw lifetime
//   timestamp pull.
async function computeViewingRhythm(
  userId: string,
  range: StatsRange,
  now: Date,
): Promise<{ viewingRhythm: ViewingRhythm; weekdayRhythm: WeekdayRhythm }> {
  if (range.kind === "all") {
    const yearly = await getYearlyActivityCounts(userId);
    // "All time" never fetches raw timestamps (would mean an unbounded
    // lifetime pull) — the weekday breakdown simply isn't available here,
    // same documented limitation as any other range-bound insight (see
    // `computeWeekdayActivity`).
    if (yearly.length === 0) return { viewingRhythm: null, weekdayRhythm: null };
    return {
      viewingRhythm: { granularity: "year", buckets: computeYearlyActivity(yearly) },
      weekdayRhythm: null,
    };
  }

  if (range.kind === "month") {
    const bounds = resolveStatsRangeBounds(range, now);
    if (!bounds) return { viewingRhythm: null, weekdayRhythm: null };
    const timestamps = await getViewingTimestampsInRange(userId, bounds);
    return {
      viewingRhythm: { granularity: "day", buckets: computeDailyActivity(timestamps, range) },
      weekdayRhythm: computeWeekdayActivity(timestamps, MIN_EVENTS_FOR_WEEKDAY_INSIGHT),
    };
  }

  // "year" / "last12months" — a real trailing-12-month window: for a
  // specific past year, "now" for bucketing purposes is that year's own
  // Jan 1 of the *following* year, so the existing trailing-window
  // function lands exactly on Jan-Dec of the requested year.
  const anchorNow = range.kind === "year" ? new Date(Date.UTC(range.year + 1, 0, 1)) : now;
  const bounds = resolveStatsRangeBounds(range, now);
  if (!bounds) return { viewingRhythm: null, weekdayRhythm: null };
  const timestamps = await getViewingTimestampsInRange(userId, bounds);
  const monthly = computeMonthlyActivity(timestamps, STATS_TIMELINE_MONTHS, anchorNow);
  return {
    viewingRhythm: { granularity: "month", buckets: toActivityBuckets(monthly) },
    weekdayRhythm: computeWeekdayActivity(timestamps, MIN_EVENTS_FOR_WEEKDAY_INSIGHT),
  };
}

// Builds one full `StatsProfile` for an already-resolved `bounds` — the
// one place range-scoped aggregation, provider hydration, and every pure
// insight computation come together. Shared by both `getStatsProfile`
// (the selected range) and `getStatsComparison` (the previous
// equivalent period) so there is exactly one profile-building path, not
// two — `lightweight` skips work Comparison's own previous-period
// profile never needs rendered (director portraits, the rhythm chart),
// saving real provider requests and a raw-timestamp fetch.
async function buildStatsProfile(input: {
  userId: string;
  range: StatsRange;
  bounds: StatsRangeBounds;
  now: Date;
  lightweight?: boolean;
}): Promise<StatsProfile> {
  const { userId, range, bounds, now, lightweight = false } = input;

  const [viewingVolume, trackingCounts, movieAggregates, showAggregates] = await Promise.all([
    getViewingVolume(userId, bounds),
    getTrackingStateCounts(userId),
    getMovieWatchAggregates(userId, bounds),
    getShowWatchAggregates(userId, bounds),
  ]);

  // Computed on the full (unbounded within the range, cheap — SQL
  // group/count only) aggregate rows, so a rewatch title is never missed
  // just because it falls outside the recent-hydration window.
  const mostRewatchedMovieAgg = findMostRewatchedMovie(movieAggregates);
  const mostRevisitedShowAgg = findMostRevisitedShow(showAggregates);

  const selectedMovieIds = selectHydrationIds({
    candidates: movieAggregates.map((movie) => ({
      id: movie.movieProviderId,
      lastActivityAt: movie.lastWatchedAt,
    })),
    mustIncludeIds: mostRewatchedMovieAgg ? [mostRewatchedMovieAgg.movieProviderId] : [],
    limit: TASTE_RECENT_MOVIE_HYDRATION_LIMIT,
  });
  const selectedShowIds = selectHydrationIds({
    candidates: showAggregates.map((show) => ({
      id: show.showProviderId,
      lastActivityAt: show.lastActivityAt,
    })),
    mustIncludeIds: mostRevisitedShowAgg ? [mostRevisitedShowAgg.showProviderId] : [],
    limit: TASTE_RECENT_SHOW_HYDRATION_LIMIT,
  });
  const selectedMovieIdSet = new Set(selectedMovieIds);
  const selectedShowIdSet = new Set(selectedShowIds);

  // Credits (director/cast) are the expensive part of hydration — only a
  // smaller, most-recently-active subset of the already-selected titles
  // gets fetched, bounded independent of total lifetime history (see
  // TASTE_CREDITS_HYDRATION_LIMIT).
  const selectedMovies = movieAggregates.filter((movie) =>
    selectedMovieIdSet.has(movie.movieProviderId),
  );
  const selectedShows = showAggregates.filter((show) => selectedShowIdSet.has(show.showProviderId));
  const creditsMovieIdSet = new Set(
    selectHydrationIds({
      candidates: selectedMovies.map((movie) => ({
        id: movie.movieProviderId,
        lastActivityAt: movie.lastWatchedAt,
      })),
      mustIncludeIds: mostRewatchedMovieAgg ? [mostRewatchedMovieAgg.movieProviderId] : [],
      limit: TASTE_CREDITS_HYDRATION_LIMIT,
    }),
  );
  const creditsShowIdSet = new Set(
    selectHydrationIds({
      candidates: selectedShows.map((show) => ({
        id: show.showProviderId,
        lastActivityAt: show.lastActivityAt,
      })),
      mustIncludeIds: mostRevisitedShowAgg ? [mostRevisitedShowAgg.showProviderId] : [],
      limit: TASTE_CREDITS_HYDRATION_LIMIT,
    }),
  );

  const titles = await hydrateTasteTitles({
    movies: selectedMovies.map((movie) => ({
      movieProviderId: movie.movieProviderId,
      watchCount: movie.watchCount,
      lastWatchedAt: movie.lastWatchedAt,
      fetchCredits: creditsMovieIdSet.has(movie.movieProviderId),
    })),
    shows: selectedShows.map((show) => ({
      showProviderId: show.showProviderId,
      watchedEpisodeCount: show.watchedEpisodeCount,
      rewatchedEpisodeCount: show.rewatchedEpisodeCount,
      totalEpisodeEvents: show.totalEpisodeEvents,
      lastActivityAt: show.lastActivityAt,
      fetchCredits: creditsShowIdSet.has(show.showProviderId),
    })),
  });

  const genres = computeGenreInsights(titles);
  const directorStats = computeFavoriteDirectors(titles);
  const actorStats = computeFavoriteActors(titles);
  const directors = lightweight ? directorStats : await hydrateDirectorPortraits(directorStats);

  const mostRewatchedMovieTitle =
    mostRewatchedMovieAgg &&
    findHydratedTitle(titles, "movie", mostRewatchedMovieAgg.movieProviderId);
  const mostRewatchedMovie: MostRewatchedMovie | null =
    mostRewatchedMovieAgg && mostRewatchedMovieTitle
      ? {
          mediaProviderId: mostRewatchedMovieAgg.movieProviderId,
          title: mostRewatchedMovieTitle.title,
          poster: mostRewatchedMovieTitle.poster,
          watchCount: mostRewatchedMovieAgg.watchCount,
        }
      : null;

  const mostRevisitedShowTitle =
    mostRevisitedShowAgg && findHydratedTitle(titles, "show", mostRevisitedShowAgg.showProviderId);
  const mostRevisitedShow: MostRevisitedShow | null =
    mostRevisitedShowAgg && mostRevisitedShowTitle
      ? {
          mediaProviderId: mostRevisitedShowAgg.showProviderId,
          title: mostRevisitedShowTitle.title,
          poster: mostRevisitedShowTitle.poster,
          rewatchedEpisodeCount: mostRevisitedShowAgg.rewatchedEpisodeCount,
        }
      : null;

  const rewatchRatePercent = computeRewatchRatePercent({
    moviesWithRewatch: movieAggregates.filter((movie) => movie.watchCount >= 2).length,
    showsWithRewatch: showAggregates.filter((show) => show.rewatchedEpisodeCount >= 1).length,
    uniqueMoviesWatched: viewingVolume.uniqueMoviesWatched,
    uniqueShowsWatched: viewingVolume.uniqueShowsWatched,
  });

  const completion = computeCompletionInsight(trackingCounts);
  const movieVsShow = computeMovieVsShowInsight(
    viewingVolume.uniqueMoviesWatched,
    viewingVolume.uniqueShowsWatched,
  );

  const headline = computeTasteHeadline(genres, directors, actorStats);

  const hasAnyHistory =
    viewingVolume.uniqueMoviesWatched > 0 || viewingVolume.uniqueEpisodesWatched > 0;
  let viewingRhythm: ViewingRhythm = null;
  let weekdayRhythm: WeekdayRhythm = null;
  if (!lightweight && hasAnyHistory) {
    const rhythm = await computeViewingRhythm(userId, range, now);
    viewingRhythm = rhythm.viewingRhythm;
    weekdayRhythm = rhythm.weekdayRhythm;
  }
  const estimatedViewingTime = estimateViewingTime(
    titles,
    viewingVolume.movieWatchEventCount,
    viewingVolume.episodeWatchEventCount,
  );

  return {
    range,
    hasAnyHistory,
    overview: viewingVolume,
    headline,
    viewingRhythm,
    weekdayRhythm,
    estimatedViewingTime,
    genres,
    directors,
    actors: actorStats,
    rewatch: { mostRewatchedMovie, mostRevisitedShow, rewatchRatePercent },
    movieVsShow,
    completion,
  };
}

export async function getStatsProfile(range: StatsRange): Promise<StatsProfile> {
  const { user } = await requireSession();
  const now = new Date();
  const bounds = resolveStatsRangeBounds(range, now);
  return buildStatsProfile({ userId: user.id, range, bounds, now });
}

function previousRangeLabel(range: StatsRange, now: Date): string {
  if (range.kind === "year") return String(range.year - 1);
  if (range.kind === "month") {
    const bounds = resolvePreviousStatsRangeBounds(range, now);
    return bounds
      ? formatStatsRangeLabel({
          kind: "month",
          year: bounds.start.getUTCFullYear(),
          month: bounds.start.getUTCMonth() + 1,
        })
      : "";
  }
  return "the previous 12 months";
}

// Optional Compare capability (see docs/stats.md, "Comparison") — `null`
// when the selected range has no meaningful previous period ("All
// time") or, defensively, when bounds can't be resolved. Fetches the
// current and previous profiles once each (never twice — the page calls
// this instead of `getStatsProfile` when Compare is active, reusing its
// own `current` rather than fetching the range separately).
export async function getStatsComparison(range: StatsRange): Promise<{
  current: StatsProfile;
  previous: StatsProfile;
  comparison: StatsComparison;
} | null> {
  if (!statsRangeSupportsComparison(range)) return null;

  const { user } = await requireSession();
  const now = new Date();
  const previousBounds = resolvePreviousStatsRangeBounds(range, now);
  if (!previousBounds) return null;
  const currentBounds = resolveStatsRangeBounds(range, now);

  const [current, previous] = await Promise.all([
    buildStatsProfile({ userId: user.id, range, bounds: currentBounds, now }),
    buildStatsProfile({
      userId: user.id,
      range,
      bounds: previousBounds,
      now,
      lightweight: true,
    }),
  ]);

  const comparison = deriveStatsComparison(current, previous, previousRangeLabel(range, now));
  return { current, previous, comparison };
}

// The current user's real active years — powers the range control's
// year chips (see docs/stats.md, "Historical years"). Bounded by the
// number of distinct active years, never event count.
export async function getStatsActiveYears(): Promise<readonly number[]> {
  const { user } = await requireSession();
  return getActiveStatsYears(user.id);
}
