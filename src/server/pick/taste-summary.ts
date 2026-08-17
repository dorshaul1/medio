import "server-only";
import { getMovieWatchAggregates, getShowWatchAggregates } from "@/server/stats/candidates";
import { computeGenreInsights } from "@/server/stats/genres";
import { hydrateTasteTitles } from "@/server/stats/hydrate";
import { selectHydrationIds } from "@/server/stats/hydration-selection";
import { computeFavoriteDirectors } from "@/server/stats/people";
import type { TasteMovieTitle, TasteShowTitle } from "@/server/stats/types";
import {
  PICK_TASTE_CREDITS_LIMIT,
  PICK_TASTE_GENRE_LIMIT,
  PICK_TASTE_HYDRATION_LIMIT,
  PICK_TASTE_MIN_TITLES_FOR_PERSONALIZATION,
  PICK_TASTE_SEED_MOVIE_LIMIT,
  PICK_TASTE_SEED_SHOW_LIMIT,
} from "./constants";
import type { RecommendationSeed, RecommendationTasteSummary } from "./types";

// Pick's own dedicated taste projection — deliberately not built by
// calling `getStatsProfile()` (see docs/recommendations.md, "Why not
// reuse Stats directly"): Stats composes a whole page of derived
// insights Pick never uses (rewatch, completion, timeline, ...), and
// computing all of that on every Pick request/"Another Pick" click would
// be wasted work for a feature that only ever needs a handful of ranking
// seeds. The underlying *pure* ranking functions (genre/director) are
// shared with Stats — only the composition differs.
//
// Every signal here is exposure-based (what the user actually watches
// and rewatches), never rating-based — MEDIO has no personal rating
// feature (see docs/opinions.md). A rewatch is the strongest available
// implicit preference signal (watching something again is a stronger
// statement than watching it once), so seed ranking prefers it.
//
// Movie and show genre affinities are kept separate — never merged —
// because TMDB's movie and TV genre ID spaces are different (see
// docs/media-provider.md); a merged list could send a show's genre ID to
// the movie discovery endpoint (see candidates-discovery.ts).

function rankMovieSeeds(titles: readonly TasteMovieTitle[], limit: number): RecommendationSeed[] {
  return [...titles]
    .sort(
      (a, b) =>
        b.watchCount - a.watchCount || b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
    )
    .slice(0, limit)
    .map((title) => ({ id: title.mediaProviderId, title: title.title }));
}

function rankShowSeeds(titles: readonly TasteShowTitle[], limit: number): RecommendationSeed[] {
  return [...titles]
    .sort(
      (a, b) =>
        b.rewatchedEpisodeCount - a.rewatchedEpisodeCount ||
        b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
    )
    .slice(0, limit)
    .map((title) => ({ id: title.mediaProviderId, title: title.title }));
}

export async function getRecommendationTasteSummary(
  userId: string,
): Promise<RecommendationTasteSummary> {
  const empty: RecommendationTasteSummary = {
    hasEnoughDataForPersonalization: false,
    movieGenreAffinities: [],
    showGenreAffinities: [],
    topDirector: null,
    seedMovies: [],
    seedShows: [],
  };

  // Pick always reasons over the user's entire history, never a Stats UI
  // date range (see CLAUDE.md, "Stats + Pick for Me") — `null` bounds
  // mean unbounded/all-time, same behavior these calls always had before
  // Stats 2.0 introduced ranges.
  const [movieAggregates, showAggregates] = await Promise.all([
    getMovieWatchAggregates(userId, null),
    getShowWatchAggregates(userId, null),
  ]);

  // Every signal below is derived from real watch history — a user with
  // too few distinct titles has nothing meaningful to personalize from
  // yet, so the (comparatively expensive) hydration is skipped entirely
  // rather than run for nothing (see docs/recommendations.md, "New user
  // fallback").
  if (movieAggregates.length + showAggregates.length < PICK_TASTE_MIN_TITLES_FOR_PERSONALIZATION) {
    return empty;
  }

  // Bounded hydration, same discipline as `server/stats/compose.ts`:
  // the most recently active titles are selected up to the limit.
  const selectedMovieIds = new Set(
    selectHydrationIds({
      candidates: movieAggregates.map((movie) => ({
        id: movie.movieProviderId,
        lastActivityAt: movie.lastWatchedAt,
      })),
      mustIncludeIds: [],
      limit: PICK_TASTE_HYDRATION_LIMIT,
    }),
  );
  const selectedShowIds = new Set(
    selectHydrationIds({
      candidates: showAggregates.map((show) => ({
        id: show.showProviderId,
        lastActivityAt: show.lastActivityAt,
      })),
      mustIncludeIds: [],
      limit: PICK_TASTE_HYDRATION_LIMIT,
    }),
  );
  const selectedMovies = movieAggregates.filter((movie) =>
    selectedMovieIds.has(movie.movieProviderId),
  );
  const selectedShows = showAggregates.filter((show) => selectedShowIds.has(show.showProviderId));

  // Credits (director) are only fetched for a smaller, most-recently-
  // active subset — the expensive provider component, bounded
  // independent of the details-hydration set above.
  const creditsMovieIds = new Set(
    selectHydrationIds({
      candidates: selectedMovies.map((movie) => ({
        id: movie.movieProviderId,
        lastActivityAt: movie.lastWatchedAt,
      })),
      mustIncludeIds: [],
      limit: PICK_TASTE_CREDITS_LIMIT,
    }),
  );

  const titles = await hydrateTasteTitles({
    movies: selectedMovies.map((movie) => ({
      movieProviderId: movie.movieProviderId,
      watchCount: movie.watchCount,
      lastWatchedAt: movie.lastWatchedAt,
      fetchCredits: creditsMovieIds.has(movie.movieProviderId),
    })),
    shows: selectedShows.map((show) => ({
      showProviderId: show.showProviderId,
      watchedEpisodeCount: show.watchedEpisodeCount,
      rewatchedEpisodeCount: show.rewatchedEpisodeCount,
      totalEpisodeEvents: show.totalEpisodeEvents,
      lastActivityAt: show.lastActivityAt,
      fetchCredits: false,
    })),
  });

  const movieTitles = titles.filter(
    (title): title is TasteMovieTitle => title.mediaType === "movie",
  );
  const showTitles = titles.filter((title): title is TasteShowTitle => title.mediaType === "show");

  const movieGenreAffinities = computeGenreInsights(movieTitles).mostWatched.slice(
    0,
    PICK_TASTE_GENRE_LIMIT,
  );
  const showGenreAffinities = computeGenreInsights(showTitles).mostWatched.slice(
    0,
    PICK_TASTE_GENRE_LIMIT,
  );
  // Director scope is movie-only, same reasoning as Stats' own favorite
  // directors (a show's per-episode directors are a noisy signal — see
  // server/stats/people.ts).
  const [topDirectorStat] = computeFavoriteDirectors(titles);

  const seedMovies = rankMovieSeeds(movieTitles, PICK_TASTE_SEED_MOVIE_LIMIT);
  const seedShows = rankShowSeeds(showTitles, PICK_TASTE_SEED_SHOW_LIMIT);

  const hasEnoughDataForPersonalization =
    movieGenreAffinities.length > 0 ||
    showGenreAffinities.length > 0 ||
    topDirectorStat !== undefined ||
    seedMovies.length > 0 ||
    seedShows.length > 0;

  return {
    hasEnoughDataForPersonalization,
    movieGenreAffinities,
    showGenreAffinities,
    topDirector: topDirectorStat
      ? { id: topDirectorStat.personId, name: topDirectorStat.name }
      : null,
    seedMovies,
    seedShows,
  };
}
