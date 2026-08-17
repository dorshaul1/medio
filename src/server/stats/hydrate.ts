import "server-only";
import type { CreditedPerson } from "@/server/media/types";
import {
  getMovieCredits,
  getMovieDetails,
  getShowAggregateCredits,
  getShowDetails,
} from "@/server/tmdb/queries";
import { TASTE_PRIMARY_CAST_LIMIT } from "./constants";
import type { TasteCastCredit, TasteMovieTitle, TasteShowTitle, TasteTitle } from "./types";

// The bounded provider-hydration layer — see docs/stats.md, "Provider
// metadata strategy". Two deliberately different costs:
//
// - Every selected title (bounded by `selectHydrationIds`, see
//   hydration-selection.ts) gets exactly one details fetch for genres/
//   title/poster (`getMovieDetails`/`getShowDetails`) — the same 24h
//   shared, public-cache fetch every other page in this app already
//   performs for the same title.
// - Only a smaller, most-recently-active subset (`fetchCredits: true`,
//   selected by compose.ts via TASTE_CREDITS_HYDRATION_LIMIT)
//   additionally gets a credits fetch (`getMovieCredits`/
//   `getShowAggregateCredits`) for Director/Actor ranking — the most
//   expensive provider component, so it's scoped to the smallest,
//   most-bounded set (see docs/stats.md, "People credits").
//
// A single title's hydration failure never breaks the rest of the
// profile — it's simply omitted, the same graceful-degradation contract
// `server/library/compose.ts`/`server/diary/hydrate.ts` already apply.

export type MovieCandidateInput = {
  movieProviderId: number;
  watchCount: number;
  lastWatchedAt: Date;
  fetchCredits: boolean;
};

export type ShowCandidateInput = {
  showProviderId: number;
  watchedEpisodeCount: number;
  rewatchedEpisodeCount: number;
  totalEpisodeEvents: number;
  lastActivityAt: Date;
  fetchCredits: boolean;
};

async function hydrateMovie(candidate: MovieCandidateInput): Promise<TasteMovieTitle | null> {
  try {
    const details = await getMovieDetails(candidate.movieProviderId);

    let directors: readonly CreditedPerson[] = [];
    let cast: readonly TasteCastCredit[] = [];
    if (candidate.fetchCredits) {
      const credits = await getMovieCredits(candidate.movieProviderId);
      directors = credits.directors;
      cast = credits.cast
        .slice(0, TASTE_PRIMARY_CAST_LIMIT)
        .map((member) => ({ id: member.id, name: member.name, profile: member.profile }));
    }

    return {
      mediaType: "movie",
      mediaProviderId: candidate.movieProviderId,
      title: details.title,
      poster: details.poster,
      year: details.releaseYear,
      genres: details.genres,
      lastActivityAt: candidate.lastWatchedAt,
      watchCount: candidate.watchCount,
      directors,
      cast,
      runtimeMinutes: details.runtimeMinutes,
    };
  } catch {
    return null;
  }
}

async function hydrateShow(candidate: ShowCandidateInput): Promise<TasteShowTitle | null> {
  try {
    const details = await getShowDetails(candidate.showProviderId);

    let cast: readonly TasteCastCredit[] = [];
    if (candidate.fetchCredits) {
      const credits = await getShowAggregateCredits(candidate.showProviderId);
      cast = credits.cast
        .slice(0, TASTE_PRIMARY_CAST_LIMIT)
        .map((member) => ({ id: member.id, name: member.name, profile: member.profile }));
    }

    return {
      mediaType: "show",
      mediaProviderId: candidate.showProviderId,
      title: details.title,
      poster: details.poster,
      year: details.firstAirYear,
      genres: details.genres,
      lastActivityAt: candidate.lastActivityAt,
      watchedEpisodeCount: candidate.watchedEpisodeCount,
      rewatchedEpisodeCount: candidate.rewatchedEpisodeCount,
      totalEpisodeEvents: candidate.totalEpisodeEvents,
      // Free — already on the same ShowDetails response used for genres
      // above, no extra provider request (see docs/stats.md).
      creators: details.creators,
      cast,
      episodeRuntimeMinutes: details.episodeRuntimeMinutes,
    };
  } catch {
    return null;
  }
}

// Parallel, bounded, deduplicated by construction (callers pass one
// candidate per unique title — see compose.ts). Never per-episode, never
// unbounded by total lifetime history.
export async function hydrateTasteTitles(input: {
  movies: readonly MovieCandidateInput[];
  shows: readonly ShowCandidateInput[];
}): Promise<readonly TasteTitle[]> {
  const [movies, shows] = await Promise.all([
    Promise.all(input.movies.map(hydrateMovie)),
    Promise.all(input.shows.map(hydrateShow)),
  ]);

  return [
    ...movies.filter((title): title is TasteMovieTitle => title !== null),
    ...shows.filter((title): title is TasteShowTitle => title !== null),
  ];
}
