import "server-only";
import type { MediaSummary } from "@/server/media/types";
import {
  discoverMoviesByGenre,
  discoverShowsByGenre,
  getMovieDetails,
  getMovieRecommendations,
  getPersonCombinedCredits,
  getPopularMovies,
  getPopularShows,
  getShowDetails,
  getShowRecommendations,
} from "@/server/tmdb/queries";
import { getWatchedMovieIds } from "@/server/tracking/movie-events";
import { getKnownShowIds } from "@/server/tracking/show-state";
import { PICK_DISCOVERY_PER_SOURCE_LIMIT, PICK_DISCOVERY_RAW_CANDIDATE_LIMIT } from "./constants";
import type {
  DiscoveryMovieCandidate,
  DiscoveryShowCandidate,
  RecommendationTasteSummary,
} from "./types";

// Bounded, source-tagged discovery expansion — see docs/recommendations.md,
// "Discovery pool". This never ranks or paginates the full TMDB catalog:
// every source below is one or two fixed provider requests, and the raw,
// merged, exclusion-filtered candidate set is capped
// (PICK_DISCOVERY_RAW_CANDIDATE_LIMIT) *before* the comparatively
// expensive full-details hydration that follows.

type RawMovie = { id: number; source: DiscoveryMovieCandidate["source"]; seedTitle: string | null };
type RawShow = { id: number; source: DiscoveryShowCandidate["source"]; seedTitle: string | null };

// Merges raw candidates across sources, first-seen wins — `sources` is
// passed in priority order (recommendation > director > genre > popular),
// so a title surfaced by more than one source keeps its strongest label.
function mergeRaw<T extends { id: number }>(sources: readonly (readonly T[])[]): T[] {
  const seen = new Map<number, T>();
  for (const list of sources) {
    for (const item of list) {
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
  }
  return [...seen.values()];
}

function toRawEntries<Source extends string>(
  items: readonly MediaSummary[],
  source: Source,
  seedTitle: string | null,
): { id: number; source: Source; seedTitle: string | null }[] {
  return items
    .slice(0, PICK_DISCOVERY_PER_SOURCE_LIMIT)
    .map((item) => ({ id: item.id, source, seedTitle }));
}

async function gatherRawMovies(taste: RecommendationTasteSummary): Promise<RawMovie[]> {
  const sources: RawMovie[][] = [];

  // (a) "More like this" seeded from the user's own highest-rated movies
  // — the strongest personalization signal available (see
  // docs/recommendations.md).
  if (taste.seedMovies.length > 0) {
    const perSeed = await Promise.all(
      taste.seedMovies.map(async (seed) => {
        const recommended = await getMovieRecommendations(seed.id).catch(() => []);
        return toRawEntries(recommended, "recommendation" as const, seed.title);
      }),
    );
    sources.push(...perSeed);
  }

  // (b) The user's favorite director's other movies — one bounded fetch,
  // filtered locally to directing credits on movies (see
  // docs/recommendations.md, "Director discovery"). Reuses the already-
  // fetched combined-credits shape rather than a dedicated filmography
  // endpoint — no extra request type.
  if (taste.topDirector) {
    try {
      const credits = await getPersonCombinedCredits(taste.topDirector.id);
      const directed = credits.crew
        .filter((credit) => credit.job === "Director" && credit.mediaType === "movie")
        .slice(0, PICK_DISCOVERY_PER_SOURCE_LIMIT)
        .map((credit) => ({
          id: credit.mediaProviderId,
          source: "director" as const,
          seedTitle: null,
        }));
      sources.push(directed);
    } catch {
      // One fewer discovery source — never breaks the rest of Pick.
    }
  }

  // (c) The user's highest-rated movie genre, top-rated within it — a
  // broader taste-adjacent source alongside the two above.
  const topMovieGenre = taste.movieGenreAffinities[0];
  if (topMovieGenre) {
    try {
      const page = await discoverMoviesByGenre(topMovieGenre.genreId, { sort: "top_rated" });
      sources.push(toRawEntries(page.items, "genre" as const, null));
    } catch {
      // Same reasoning as above.
    }
  }

  // (d) Honest fallback for a brand-new/thin-taste account — never
  // fabricates personalization it doesn't have (see
  // docs/recommendations.md, "New user fallback").
  if (sources.every((list) => list.length === 0)) {
    const popular = await getPopularMovies().catch(() => []);
    sources.push(toRawEntries(popular, "popular" as const, null));
  }

  return mergeRaw(sources);
}

async function gatherRawShows(taste: RecommendationTasteSummary): Promise<RawShow[]> {
  const sources: RawShow[][] = [];

  if (taste.seedShows.length > 0) {
    const perSeed = await Promise.all(
      taste.seedShows.map(async (seed) => {
        const recommended = await getShowRecommendations(seed.id).catch(() => []);
        return toRawEntries(recommended, "recommendation" as const, seed.title);
      }),
    );
    sources.push(...perSeed);
  }

  // Shows have no director-credit discovery source — a show's directing
  // credit is per-episode and per-season, not a stable per-title fact
  // the way a movie's is (see docs/recommendations.md, "Deferred: actor/
  // director discovery for shows").

  const topShowGenre = taste.showGenreAffinities[0];
  if (topShowGenre) {
    try {
      const page = await discoverShowsByGenre(topShowGenre.genreId, { sort: "top_rated" });
      sources.push(toRawEntries(page.items, "genre" as const, null));
    } catch {
      // Same reasoning as movies above.
    }
  }

  if (sources.every((list) => list.length === 0)) {
    const popular = await getPopularShows().catch(() => []);
    sources.push(toRawEntries(popular, "popular" as const, null));
  }

  return mergeRaw(sources);
}

export async function getDiscoveryCandidates(input: {
  taste: RecommendationTasteSummary;
  // Already-saved/already-continuing media ids the caller knows about —
  // excluded before any extra query, so a title already surfaced
  // elsewhere in Pick is never also offered as a "fresh" discovery.
  excludeMovieIds: ReadonlySet<number>;
  excludeShowIds: ReadonlySet<number>;
}): Promise<{
  movies: readonly DiscoveryMovieCandidate[];
  shows: readonly DiscoveryShowCandidate[];
}> {
  const [rawMovies, rawShows] = await Promise.all([
    gatherRawMovies(input.taste),
    gatherRawShows(input.taste),
  ]);

  const preFilteredMovies = rawMovies.filter((movie) => !input.excludeMovieIds.has(movie.id));
  const preFilteredShows = rawShows.filter((show) => !input.excludeShowIds.has(show.id));

  // One more exclusion pass against the user's actual watch history —
  // a title can be a real TMDB "recommendation" for a seed the user
  // loved while *also* already being something they've watched (a
  // rewatchable classic), which must never be offered as a fresh
  // discovery (see docs/recommendations.md, "Discovery candidate
  // exclusion"). Bounded to this already-small raw candidate set, never
  // one query per candidate.
  const [alreadyWatchedMovieIds, alreadyKnownShowIds] = await Promise.all([
    getWatchedMovieIds(preFilteredMovies.map((movie) => movie.id)),
    getKnownShowIds(preFilteredShows.map((show) => show.id)),
  ]);

  const finalMovies = preFilteredMovies
    .filter((movie) => !alreadyWatchedMovieIds.has(movie.id))
    .slice(0, PICK_DISCOVERY_RAW_CANDIDATE_LIMIT);
  const finalShows = preFilteredShows
    .filter((show) => !alreadyKnownShowIds.has(show.id))
    .slice(0, PICK_DISCOVERY_RAW_CANDIDATE_LIMIT);

  const [hydratedMovies, hydratedShows] = await Promise.all([
    Promise.all(
      finalMovies.map(async (movie): Promise<DiscoveryMovieCandidate | null> => {
        try {
          const details = await getMovieDetails(movie.id);
          return {
            kind: "discoveryMovie",
            mediaType: "movie",
            mediaProviderId: movie.id,
            title: details.title,
            poster: details.poster,
            backdrop: details.backdrop,
            year: details.releaseYear,
            genres: details.genres,
            runtimeMinutes: details.runtimeMinutes,
            source: movie.source,
            seedTitle: movie.seedTitle,
          };
        } catch {
          return null;
        }
      }),
    ),
    Promise.all(
      finalShows.map(async (show): Promise<DiscoveryShowCandidate | null> => {
        try {
          const details = await getShowDetails(show.id);
          return {
            kind: "discoveryShow",
            mediaType: "show",
            mediaProviderId: show.id,
            title: details.title,
            poster: details.poster,
            backdrop: details.backdrop,
            year: details.firstAirYear,
            genres: details.genres,
            runtimeMinutes: details.episodeRuntimeMinutes,
            source: show.source,
            seedTitle: show.seedTitle,
          };
        } catch {
          return null;
        }
      }),
    ),
  ]);

  return {
    movies: hydratedMovies.filter((movie): movie is DiscoveryMovieCandidate => movie !== null),
    shows: hydratedShows.filter((show): show is DiscoveryShowCandidate => show !== null),
  };
}
