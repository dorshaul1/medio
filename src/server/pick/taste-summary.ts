import "server-only";
import { listMediaRatings } from "@/server/opinions/ratings";
import { getMovieWatchAggregates, getShowWatchAggregates } from "@/server/stats/candidates";
import { computeGenreInsights } from "@/server/stats/genres";
import { hydrateTasteTitles } from "@/server/stats/hydrate";
import { selectHydrationIds } from "@/server/stats/hydration-selection";
import { computeFavoriteDirectors } from "@/server/stats/people";
import type { TasteTitle } from "@/server/stats/types";
import {
  PICK_TASTE_GENRE_LIMIT,
  PICK_TASTE_HYDRATION_LIMIT,
  PICK_TASTE_SEED_MOVIE_LIMIT,
  PICK_TASTE_SEED_SHOW_LIMIT,
} from "./constants";
import type { RecommendationSeed, RecommendationTasteSummary } from "./types";

// Pick's own dedicated taste projection — deliberately not built by
// calling `getStatsProfile()` (see docs/recommendations.md, "Why not
// reuse Stats directly"): Stats composes a whole page of derived
// insights Pick never uses (rewatch, completion, rating distribution,
// timeline, ...), and computing all of that on every Pick request/
// "Another Pick" click would be wasted work for a feature that only ever
// needs a handful of ranking seeds. The underlying *pure* ranking
// functions (genre/director) are shared with Stats — only the
// composition differs.
//
// Movie and show genre affinities are kept separate — never merged —
// because TMDB's movie and TV genre ID spaces are different (see
// docs/media-provider.md); a merged list could send a show's genre ID to
// the movie discovery endpoint (see candidates-discovery.ts).

function ratingKey(mediaType: "movie" | "show", providerId: number): string {
  return `${mediaType}:${providerId}`;
}

function rankSeeds(titles: readonly TasteTitle[], limit: number): RecommendationSeed[] {
  return titles
    .filter((title) => title.rating !== null)
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
    )
    .slice(0, limit)
    .map((title) => ({ id: title.mediaProviderId, title: title.title }));
}

export async function getRecommendationTasteSummary(
  userId: string,
): Promise<RecommendationTasteSummary> {
  const ratings = await listMediaRatings();

  const empty: RecommendationTasteSummary = {
    hasEnoughDataForPersonalization: false,
    movieGenreAffinities: [],
    showGenreAffinities: [],
    topDirector: null,
    seedMovies: [],
    seedShows: [],
  };
  // Every signal below (genre affinity, favorite director, seeds) is
  // rating-gated — a user with watch history but zero ratings has
  // nothing this summary can use, so the (comparatively expensive)
  // aggregate queries are skipped entirely rather than run for nothing.
  if (ratings.length === 0) return empty;

  const [movieAggregates, showAggregates] = await Promise.all([
    getMovieWatchAggregates(userId),
    getShowWatchAggregates(userId),
  ]);

  const ratingByKey = new Map(
    ratings.map((rating) => [ratingKey(rating.mediaType, rating.mediaProviderId), rating.rating]),
  );

  // Bounded hydration, same discipline as `server/stats/compose.ts`:
  // every rated title is always included; remaining slots go to the most
  // recently active titles.
  const selectedMovieIds = new Set(
    selectHydrationIds({
      candidates: movieAggregates.map((movie) => ({
        id: movie.movieProviderId,
        lastActivityAt: movie.lastWatchedAt,
        isRated: ratingByKey.has(ratingKey("movie", movie.movieProviderId)),
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
        isRated: ratingByKey.has(ratingKey("show", show.showProviderId)),
      })),
      mustIncludeIds: [],
      limit: PICK_TASTE_HYDRATION_LIMIT,
    }),
  );

  const titles = await hydrateTasteTitles({
    movies: movieAggregates
      .filter((movie) => selectedMovieIds.has(movie.movieProviderId))
      .map((movie) => ({
        movieProviderId: movie.movieProviderId,
        watchCount: movie.watchCount,
        lastWatchedAt: movie.lastWatchedAt,
        rating: ratingByKey.get(ratingKey("movie", movie.movieProviderId)) ?? null,
      })),
    shows: showAggregates
      .filter((show) => selectedShowIds.has(show.showProviderId))
      .map((show) => ({
        showProviderId: show.showProviderId,
        watchedEpisodeCount: show.watchedEpisodeCount,
        rewatchedEpisodeCount: show.rewatchedEpisodeCount,
        totalEpisodeEvents: show.totalEpisodeEvents,
        lastActivityAt: show.lastActivityAt,
        rating: ratingByKey.get(ratingKey("show", show.showProviderId)) ?? null,
      })),
  });

  const movieTitles = titles.filter((title) => title.mediaType === "movie");
  const showTitles = titles.filter((title) => title.mediaType === "show");

  const movieGenreAffinities = computeGenreInsights(movieTitles).highestRated.slice(
    0,
    PICK_TASTE_GENRE_LIMIT,
  );
  const showGenreAffinities = computeGenreInsights(showTitles).highestRated.slice(
    0,
    PICK_TASTE_GENRE_LIMIT,
  );
  // Director scope is movie-only, same reasoning as Stats' own favorite
  // directors (a show's per-episode directors are a noisy signal — see
  // server/stats/people.ts).
  const [topDirectorStat] = computeFavoriteDirectors(titles);

  const seedMovies = rankSeeds(movieTitles, PICK_TASTE_SEED_MOVIE_LIMIT);
  const seedShows = rankSeeds(showTitles, PICK_TASTE_SEED_SHOW_LIMIT);

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
