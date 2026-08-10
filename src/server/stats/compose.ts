import "server-only";
import { requireSession } from "@/server/auth/session";
import { listMediaRatings } from "@/server/opinions/ratings";
import { getPersonDetails } from "@/server/tmdb/queries";
import { getRecentViewingTimestamps, getTrackingStateCounts, getViewingVolume } from "./aggregates";
import { getMovieWatchAggregates, getShowWatchAggregates } from "./candidates";
import { computeCompletionInsight } from "./completion";
import {
  STATS_TIMELINE_MONTHS,
  TASTE_RECENT_MOVIE_HYDRATION_LIMIT,
  TASTE_RECENT_SHOW_HYDRATION_LIMIT,
} from "./constants";
import { computeGenreInsights } from "./genres";
import { computeTasteHeadline } from "./headline";
import { hydrateTasteTitles } from "./hydrate";
import { selectHydrationIds } from "./hydration-selection";
import { computeMovieVsShowInsight } from "./movie-vs-show";
import { computeFavoriteActors, computeFavoriteDirectors } from "./people";
import { computeMovieShowRatingComparison, computeRatingDistribution } from "./rating-summary";
import {
  computeRewatchRatePercent,
  findMostRevisitedShow,
  findMostRewatchedMovie,
} from "./rewatch";
import { computeMonthlyActivity } from "./timeline";
import type {
  MostRevisitedShow,
  MostRewatchedMovie,
  PersonTasteStat,
  StatsProfile,
  TasteTitle,
} from "./types";
import { estimateViewingTime } from "./viewing-time";

// The one server entrypoint this whole domain exists to produce — see
// docs/stats.md. Owns the session boundary (same layering as
// `getLibraryPage`/`getDiaryPage`): every lower-level query in this
// directory is explicitly `userId`-scoped, never session-aware itself.
//
// Everything returned here is *derived* at request time from
// user-owned facts (tracking events, ratings) plus normalized provider
// metadata — nothing here is ever written back to Postgres (see
// CLAUDE.md, "Stats is derived...").

function ratingKey(mediaType: "movie" | "show", providerId: number): string {
  return `${mediaType}:${providerId}`;
}

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

export async function getStatsProfile(): Promise<StatsProfile> {
  const { user } = await requireSession();

  const [
    viewingVolume,
    trackingCounts,
    movieAggregates,
    showAggregates,
    ratings,
    recentTimestamps,
  ] = await Promise.all([
    getViewingVolume(user.id),
    getTrackingStateCounts(user.id),
    getMovieWatchAggregates(user.id),
    getShowWatchAggregates(user.id),
    listMediaRatings(),
    getRecentViewingTimestamps(user.id, STATS_TIMELINE_MONTHS),
  ]);

  const ratingByKey = new Map(
    ratings.map((rating) => [ratingKey(rating.mediaType, rating.mediaProviderId), rating.rating]),
  );

  // Computed on the full (unbounded, cheap — SQL group/count only)
  // aggregate rows, so a rewatch title is never missed just because it
  // falls outside the recent-hydration window.
  const mostRewatchedMovieAgg = findMostRewatchedMovie(movieAggregates);
  const mostRevisitedShowAgg = findMostRevisitedShow(showAggregates);

  const selectedMovieIds = selectHydrationIds({
    candidates: movieAggregates.map((movie) => ({
      id: movie.movieProviderId,
      lastActivityAt: movie.lastWatchedAt,
      isRated: ratingByKey.has(ratingKey("movie", movie.movieProviderId)),
    })),
    mustIncludeIds: mostRewatchedMovieAgg ? [mostRewatchedMovieAgg.movieProviderId] : [],
    limit: TASTE_RECENT_MOVIE_HYDRATION_LIMIT,
  });
  const selectedShowIds = selectHydrationIds({
    candidates: showAggregates.map((show) => ({
      id: show.showProviderId,
      lastActivityAt: show.lastActivityAt,
      isRated: ratingByKey.has(ratingKey("show", show.showProviderId)),
    })),
    mustIncludeIds: mostRevisitedShowAgg ? [mostRevisitedShowAgg.showProviderId] : [],
    limit: TASTE_RECENT_SHOW_HYDRATION_LIMIT,
  });
  const selectedMovieIdSet = new Set(selectedMovieIds);
  const selectedShowIdSet = new Set(selectedShowIds);

  const titles = await hydrateTasteTitles({
    movies: movieAggregates
      .filter((movie) => selectedMovieIdSet.has(movie.movieProviderId))
      .map((movie) => ({
        movieProviderId: movie.movieProviderId,
        watchCount: movie.watchCount,
        lastWatchedAt: movie.lastWatchedAt,
        rating: ratingByKey.get(ratingKey("movie", movie.movieProviderId)) ?? null,
      })),
    shows: showAggregates
      .filter((show) => selectedShowIdSet.has(show.showProviderId))
      .map((show) => ({
        showProviderId: show.showProviderId,
        watchedEpisodeCount: show.watchedEpisodeCount,
        rewatchedEpisodeCount: show.rewatchedEpisodeCount,
        totalEpisodeEvents: show.totalEpisodeEvents,
        lastActivityAt: show.lastActivityAt,
        rating: ratingByKey.get(ratingKey("show", show.showProviderId)) ?? null,
      })),
  });

  const genres = computeGenreInsights(titles);
  const directorStats = computeFavoriteDirectors(titles);
  const actors = computeFavoriteActors(titles);
  const directors = await hydrateDirectorPortraits(directorStats);

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
  const ratingDistribution = computeRatingDistribution(ratings.map((rating) => rating.rating));
  const ratingComparison = computeMovieShowRatingComparison(
    ratings.filter((rating) => rating.mediaType === "movie").map((rating) => rating.rating),
    ratings.filter((rating) => rating.mediaType === "show").map((rating) => rating.rating),
  );
  const headline = computeTasteHeadline(genres, directors);

  const hasAnyHistory =
    viewingVolume.uniqueMoviesWatched > 0 || viewingVolume.uniqueEpisodesWatched > 0;
  const viewingTimeline = hasAnyHistory
    ? computeMonthlyActivity(recentTimestamps, STATS_TIMELINE_MONTHS, new Date())
    : null;
  const estimatedViewingTime = estimateViewingTime(
    titles,
    viewingVolume.movieWatchEventCount + viewingVolume.episodeWatchEventCount,
  );

  return {
    hasAnyHistory,
    overview: viewingVolume,
    headline,
    viewingTimeline,
    estimatedViewingTime,
    genres,
    directors,
    actors,
    rewatch: { mostRewatchedMovie, mostRevisitedShow, rewatchRatePercent },
    movieVsShow,
    completion,
    ratingDistribution,
    ratingComparison,
    ratedTitleCount: ratings.length,
  };
}
