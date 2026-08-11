import "server-only";
import type {
  Genre,
  MediaSummary,
  MovieCredits,
  MovieDetails,
  Pagination,
  Person,
  PersonCredits,
  PersonSummary,
  SeasonDetails,
  ShowCredits,
  ShowDetails,
  Trailer,
} from "@/server/media/types";
import { tmdbFetch } from "./client";
import { TmdbError } from "./errors";
import {
  mapAggregateCredits,
  mapPersonCombinedCredits,
  mapTmdbCredits,
  mapTmdbGenre,
  mapTmdbMovieDetails,
  mapTmdbMovieSummary,
  mapTmdbPerson,
  mapTmdbPersonSummary,
  mapTmdbSeasonDetails,
  mapTmdbShowDetails,
  mapTmdbShowSummary,
  mapTmdbVideoToTrailer,
  selectTrailer,
} from "./mappers";
import {
  tmdbAggregateCreditsResponseSchema,
  tmdbCollectionDetailsSchema,
  tmdbCreditsResponseSchema,
  tmdbGenreListResponseSchema,
  tmdbMovieDetailsSchema,
  tmdbMovieSearchResponseSchema,
  tmdbPersonCombinedCreditsResponseSchema,
  tmdbPersonDetailsSchema,
  tmdbPersonSearchResponseSchema,
  tmdbSeasonDetailsSchema,
  tmdbShowDetailsSchema,
  tmdbShowSearchResponseSchema,
  tmdbVideosResponseSchema,
} from "./schemas";

// Default TMDB locale for this phase — a real user-locale/preferences
// system is future work (see docs/media-provider.md), not something this
// module builds preemptively. Every query still accepts an explicit
// `language` override for when that future system exists.
const DEFAULT_LANGUAGE = "en-US";

// Cache lifetimes are deliberate per endpoint, not one blanket duration:
// trending changes daily upstream, so a shorter window is honest; a given
// movie/show/season's metadata changes rarely, so a longer one avoids
// re-fetching the same thing constantly. Search is excluded entirely —
// see searchMovies/searchShows below.
const TRENDING_REVALIDATE_SECONDS = 60 * 60; // 1 hour
// Popularity-ranked lists (popular movies/shows, now playing) shift more
// slowly than trending's short-window relevance but still change through
// the day — a middle ground between trending and per-title details.
const POPULAR_REVALIDATE_SECONDS = 60 * 60 * 3; // 3 hours
const DETAILS_REVALIDATE_SECONDS = 60 * 60 * 24; // 24 hours
// Show/season details carry `next_episode_to_air`/episode air dates —
// the one piece of "static" details data that's actually temporally
// sensitive (see docs/calendar.md, "Caching strategy"). A full 24h cache
// could leave a freshly-aired episode invisible to Calendar/Home/Library
// for up to a day; a static, years-old season re-fetched every 3 hours
// is cheap (TMDB's own CDN is already caching it) and harmless. Movie
// details keep the full 24h window — a movie's release date is far less
// volatile once set, and this phase deliberately keeps Movie release
// intelligence smaller (see docs/calendar.md).
const SHOW_DETAILS_REVALIDATE_SECONDS = 60 * 60 * 3; // 3 hours
// TMDB's official genre lists change essentially never.
const GENRE_LIST_REVALIDATE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function validate<T>(schema: { parse: (value: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (cause) {
    throw new TmdbError("invalid_response", "TMDB response did not match the expected shape", {
      cause,
    });
  }
}

export type MediaQueryOptions = {
  language?: string;
  signal?: AbortSignal;
};

export type SearchOptions = MediaQueryOptions & {
  page?: number;
};

// Movie-only / show-only trending, kept deliberately separate rather than
// TMDB's combined /trending/all — Home shows "Trending movies" and
// "Trending shows" as two distinct sections so users always know what
// type they're looking at (see docs/media-provider.md).
export async function getTrendingMovies(
  options: MediaQueryOptions = {},
): Promise<readonly MediaSummary[]> {
  const raw = await tmdbFetch("/trending/movie/day", {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: TRENDING_REVALIDATE_SECONDS },
  });
  return validate(tmdbMovieSearchResponseSchema, raw).results.map(mapTmdbMovieSummary);
}

export async function getTrendingShows(
  options: MediaQueryOptions = {},
): Promise<readonly MediaSummary[]> {
  const raw = await tmdbFetch("/trending/tv/day", {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: TRENDING_REVALIDATE_SECONDS },
  });
  return validate(tmdbShowSearchResponseSchema, raw).results.map(mapTmdbShowSummary);
}

// Popularity-ranked, not short-window relevance — see docs/media-provider.md
// ("Discover vs Trending") for why this is a distinct concept from
// getTrending. Powers Home's "Popular movies" collection.
export async function getPopularMovies(
  options: MediaQueryOptions = {},
): Promise<readonly MediaSummary[]> {
  const raw = await tmdbFetch("/movie/popular", {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  return validate(tmdbMovieSearchResponseSchema, raw).results.map(mapTmdbMovieSummary);
}

// Powers Home's "Popular shows" collection.
export async function getPopularShows(
  options: MediaQueryOptions = {},
): Promise<readonly MediaSummary[]> {
  const raw = await tmdbFetch("/tv/popular", {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  return validate(tmdbShowSearchResponseSchema, raw).results.map(mapTmdbShowSummary);
}

// Currently-in-theaters movies. Powers Home's "In theaters" collection.
export async function getNowPlayingMovies(
  options: MediaQueryOptions = {},
): Promise<readonly MediaSummary[]> {
  const raw = await tmdbFetch("/movie/now_playing", {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  return validate(tmdbMovieSearchResponseSchema, raw).results.map(mapTmdbMovieSummary);
}

// TMDB's official genre lists — movie and TV genre IDs/names are NOT the
// same set (see docs/media-provider.md), so these stay separate rather
// than one shared "genres" query.
export async function getMovieGenres(options: MediaQueryOptions = {}): Promise<readonly Genre[]> {
  const raw = await tmdbFetch("/genre/movie/list", {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: GENRE_LIST_REVALIDATE_SECONDS },
  });
  return validate(tmdbGenreListResponseSchema, raw).genres.map(mapTmdbGenre);
}

export async function getShowGenres(options: MediaQueryOptions = {}): Promise<readonly Genre[]> {
  const raw = await tmdbFetch("/genre/tv/list", {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: GENRE_LIST_REVALIDATE_SECONDS },
  });
  return validate(tmdbGenreListResponseSchema, raw).genres.map(mapTmdbGenre);
}

// Discover's genre browse sort options — intentionally a small closed set,
// not TMDB's full sort_by API. Exported so UI code can validate/normalize
// a `?sort=` URL param against real values instead of guessing.
export type DiscoverSort = "popular" | "top_rated" | "newest";

const MOVIE_SORT_BY: Record<DiscoverSort, string> = {
  popular: "popularity.desc",
  top_rated: "vote_average.desc",
  newest: "primary_release_date.desc",
};

const SHOW_SORT_BY: Record<DiscoverSort, string> = {
  popular: "popularity.desc",
  top_rated: "vote_average.desc",
  newest: "first_air_date.desc",
};

// TMDB's vote_average.desc alone surfaces obscure titles that happen to
// have one perfect vote — a well-known real quirk, not hypothetical. A
// minimum vote count is what makes "top rated" actually mean something.
const TOP_RATED_MIN_VOTE_COUNT = 100;

export type DiscoverByGenreOptions = MediaQueryOptions & {
  sort?: DiscoverSort;
  page?: number;
};

export async function discoverMoviesByGenre(
  genreId: number,
  options: DiscoverByGenreOptions = {},
): Promise<Pagination<MediaSummary>> {
  const sort = options.sort ?? "popular";
  const raw = await tmdbFetch("/discover/movie", {
    query: {
      with_genres: genreId,
      sort_by: MOVIE_SORT_BY[sort],
      "vote_count.gte": sort === "top_rated" ? TOP_RATED_MIN_VOTE_COUNT : undefined,
      page: options.page ?? 1,
      language: options.language ?? DEFAULT_LANGUAGE,
      include_adult: false,
    },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  const parsed = validate(tmdbMovieSearchResponseSchema, raw);
  return {
    page: parsed.page,
    totalPages: parsed.total_pages,
    totalResults: parsed.total_results,
    items: parsed.results.map(mapTmdbMovieSummary),
  };
}

export async function discoverShowsByGenre(
  genreId: number,
  options: DiscoverByGenreOptions = {},
): Promise<Pagination<MediaSummary>> {
  const sort = options.sort ?? "popular";
  const raw = await tmdbFetch("/discover/tv", {
    query: {
      with_genres: genreId,
      sort_by: SHOW_SORT_BY[sort],
      "vote_count.gte": sort === "top_rated" ? TOP_RATED_MIN_VOTE_COUNT : undefined,
      page: options.page ?? 1,
      language: options.language ?? DEFAULT_LANGUAGE,
    },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  const parsed = validate(tmdbShowSearchResponseSchema, raw);
  return {
    page: parsed.page,
    totalPages: parsed.total_pages,
    totalResults: parsed.total_results,
    items: parsed.results.map(mapTmdbShowSummary),
  };
}

export type DiscoverCollectionOptions = MediaQueryOptions & {
  sort?: DiscoverSort;
  page?: number;
  // Movies only — a real, honest exploration dimension (see
  // docs/search.md, "Discover editorial collections"), not an arbitrary
  // filter: TMDB's own `with_runtime.lte`.
  runtimeLte?: number;
};

// Discover's own editorial collections (`features/discover/discover-editorial-collections.tsx`)
// — the same `/discover/movie`|`/discover/tv` endpoints as
// discoverMoviesByGenre/discoverShowsByGenre, just without a genre
// constraint, so a page-level "Acclaimed movies" or "Under 100 minutes"
// section can exist without inventing a fake genre. Kept as separate
// functions rather than making `genreId` optional on the two above: every
// existing call site (genre pages, genre rows) always has a real genre,
// so an optional param there would just be dead branching for them.
export async function discoverMovies(
  options: DiscoverCollectionOptions = {},
): Promise<Pagination<MediaSummary>> {
  const sort = options.sort ?? "popular";
  const raw = await tmdbFetch("/discover/movie", {
    query: {
      sort_by: MOVIE_SORT_BY[sort],
      "vote_count.gte": sort === "top_rated" ? TOP_RATED_MIN_VOTE_COUNT : undefined,
      "with_runtime.lte": options.runtimeLte,
      page: options.page ?? 1,
      language: options.language ?? DEFAULT_LANGUAGE,
      include_adult: false,
    },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  const parsed = validate(tmdbMovieSearchResponseSchema, raw);
  return {
    page: parsed.page,
    totalPages: parsed.total_pages,
    totalResults: parsed.total_results,
    items: parsed.results.map(mapTmdbMovieSummary),
  };
}

export async function discoverShows(
  options: DiscoverCollectionOptions = {},
): Promise<Pagination<MediaSummary>> {
  const sort = options.sort ?? "popular";
  const raw = await tmdbFetch("/discover/tv", {
    query: {
      sort_by: SHOW_SORT_BY[sort],
      "vote_count.gte": sort === "top_rated" ? TOP_RATED_MIN_VOTE_COUNT : undefined,
      page: options.page ?? 1,
      language: options.language ?? DEFAULT_LANGUAGE,
    },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  const parsed = validate(tmdbShowSearchResponseSchema, raw);
  return {
    page: parsed.page,
    totalPages: parsed.total_pages,
    totalResults: parsed.total_results,
    items: parsed.results.map(mapTmdbShowSummary),
  };
}

// Search endpoints have effectively unbounded cardinality — long-caching
// arbitrary queries would just grow the cache forever for little reuse, so
// these are deliberately never persistently cached.
export async function searchMovies(
  query: string,
  options: SearchOptions = {},
): Promise<Pagination<MediaSummary>> {
  const raw = await tmdbFetch("/search/movie", {
    query: {
      query,
      page: options.page ?? 1,
      language: options.language ?? DEFAULT_LANGUAGE,
      // A conservative product default — see docs/media-provider.md ("Adult
      // Content"). Not exposed as a caller option in this phase; there is
      // no content-control setting yet for it to come from.
      include_adult: false,
    },
    signal: options.signal,
    cache: "no-store",
  });
  const parsed = validate(tmdbMovieSearchResponseSchema, raw);
  return {
    page: parsed.page,
    totalPages: parsed.total_pages,
    totalResults: parsed.total_results,
    items: parsed.results.map(mapTmdbMovieSummary),
  };
}

export async function searchShows(
  query: string,
  options: SearchOptions = {},
): Promise<Pagination<MediaSummary>> {
  const raw = await tmdbFetch("/search/tv", {
    query: {
      query,
      page: options.page ?? 1,
      language: options.language ?? DEFAULT_LANGUAGE,
      include_adult: false,
    },
    signal: options.signal,
    cache: "no-store",
  });
  const parsed = validate(tmdbShowSearchResponseSchema, raw);
  return {
    page: parsed.page,
    totalPages: parsed.total_pages,
    totalResults: parsed.total_results,
    items: parsed.results.map(mapTmdbShowSummary),
  };
}

// See docs/media-provider.md, "People search" — makes People first-class
// Search results (server/search/) alongside Movies/Shows, not a
// secondary/omitted category. Same no-store policy as searchMovies/
// searchShows above, same reasoning.
export async function searchPeople(
  query: string,
  options: SearchOptions = {},
): Promise<Pagination<PersonSummary>> {
  const raw = await tmdbFetch("/search/person", {
    query: {
      query,
      page: options.page ?? 1,
      language: options.language ?? DEFAULT_LANGUAGE,
      include_adult: false,
    },
    signal: options.signal,
    cache: "no-store",
  });
  const parsed = validate(tmdbPersonSearchResponseSchema, raw);
  return {
    page: parsed.page,
    totalPages: parsed.total_pages,
    totalResults: parsed.total_results,
    items: parsed.results.map(mapTmdbPersonSummary),
  };
}

export async function getMovieDetails(
  id: number,
  options: MediaQueryOptions = {},
): Promise<MovieDetails> {
  const raw = await tmdbFetch(`/movie/${id}`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: DETAILS_REVALIDATE_SECONDS },
  });
  return mapTmdbMovieDetails(validate(tmdbMovieDetailsSchema, raw));
}

// Powers Movie Details' Cast section.
export async function getMovieCredits(
  id: number,
  options: MediaQueryOptions = {},
): Promise<MovieCredits> {
  const raw = await tmdbFetch(`/movie/${id}/credits`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: DETAILS_REVALIDATE_SECONDS },
  });
  return mapTmdbCredits(validate(tmdbCreditsResponseSchema, raw));
}

// Powers Movie Details' trailer action. Returns the one selected video
// (see selectTrailer), or null when nothing suitable exists — a movie
// with no trailer is normal, not an error.
export async function getMovieTrailer(
  id: number,
  options: MediaQueryOptions = {},
): Promise<Trailer | null> {
  const raw = await tmdbFetch(`/movie/${id}/videos`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: DETAILS_REVALIDATE_SECONDS },
  });
  const selected = selectTrailer(validate(tmdbVideosResponseSchema, raw).results);
  return selected ? mapTmdbVideoToTrailer(selected) : null;
}

// Powers Movie Details' "More like this" row.
export async function getMovieRecommendations(
  id: number,
  options: MediaQueryOptions = {},
): Promise<readonly MediaSummary[]> {
  const raw = await tmdbFetch(`/movie/${id}/recommendations`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  return validate(tmdbMovieSearchResponseSchema, raw).results.map(mapTmdbMovieSummary);
}

// Powers Movie Details' "Part of…" row — only called when a movie's own
// details named a `collection` (see mapTmdbMovieDetails). `parts` shares
// the movie search/trending result shape, so this reuses
// mapTmdbMovieSummary rather than a parallel mapper.
export async function getCollectionMovies(
  collectionId: number,
  options: MediaQueryOptions = {},
): Promise<readonly MediaSummary[]> {
  const raw = await tmdbFetch(`/collection/${collectionId}`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: DETAILS_REVALIDATE_SECONDS },
  });
  return validate(tmdbCollectionDetailsSchema, raw).parts.map(mapTmdbMovieSummary);
}

export async function getShowDetails(
  id: number,
  options: MediaQueryOptions = {},
): Promise<ShowDetails> {
  const raw = await tmdbFetch(`/tv/${id}`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: SHOW_DETAILS_REVALIDATE_SECONDS },
  });
  return mapTmdbShowDetails(validate(tmdbShowDetailsSchema, raw));
}

// Powers Season Details' episode list — the season's episodes come back
// in this one response, so this is the only fetch the season route needs
// (see docs/media-provider.md — Show Details itself never calls this for
// every season; only the one the user opens).
export async function getSeasonDetails(
  showId: number,
  seasonNumber: number,
  options: MediaQueryOptions = {},
): Promise<SeasonDetails> {
  const raw = await tmdbFetch(`/tv/${showId}/season/${seasonNumber}`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: SHOW_DETAILS_REVALIDATE_SECONDS },
  });
  return mapTmdbSeasonDetails(showId, validate(tmdbSeasonDetailsSchema, raw));
}

// Powers Show Details' Cast section — TMDB's *aggregate* credits, not the
// regular /tv/{id}/credits endpoint, because aggregate credits represent
// a person's role across the show's full run rather than just its latest
// season (see docs/media-provider.md, "TV credits").
export async function getShowAggregateCredits(
  id: number,
  options: MediaQueryOptions = {},
): Promise<ShowCredits> {
  const raw = await tmdbFetch(`/tv/${id}/aggregate_credits`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: DETAILS_REVALIDATE_SECONDS },
  });
  return mapAggregateCredits(validate(tmdbAggregateCreditsResponseSchema, raw));
}

// Powers Show Details' trailer action. Returns the one selected video
// (see selectTrailer), or null when nothing suitable exists — a show
// with no trailer is normal, not an error.
export async function getShowTrailer(
  id: number,
  options: MediaQueryOptions = {},
): Promise<Trailer | null> {
  const raw = await tmdbFetch(`/tv/${id}/videos`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: DETAILS_REVALIDATE_SECONDS },
  });
  const selected = selectTrailer(validate(tmdbVideosResponseSchema, raw).results);
  return selected ? mapTmdbVideoToTrailer(selected) : null;
}

// Powers Show Details' "More like this" row. Recommendations, not
// similar — see docs/media-provider.md for why only one of the two is
// used.
export async function getShowRecommendations(
  id: number,
  options: MediaQueryOptions = {},
): Promise<readonly MediaSummary[]> {
  const raw = await tmdbFetch(`/tv/${id}/recommendations`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: POPULAR_REVALIDATE_SECONDS },
  });
  return validate(tmdbShowSearchResponseSchema, raw).results.map(mapTmdbShowSummary);
}

// Powers `/people/[id]`'s primary identity content (name, photo,
// biography, birth/death context) — the page's one blocking fetch; see
// its own comment for why Filmography is a separate, Suspense-deferred
// request rather than fetched alongside this one.
export async function getPersonDetails(
  id: number,
  options: MediaQueryOptions = {},
): Promise<Person> {
  const raw = await tmdbFetch(`/person/${id}`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: DETAILS_REVALIDATE_SECONDS },
  });
  return mapTmdbPerson(validate(tmdbPersonDetailsSchema, raw));
}

// Powers `/people/[id]`'s Filmography/Known For sections — TMDB's
// *combined* credits (movie + TV, cast + crew, in one request) rather
// than separate `/person/{id}/movie_credits` + `/person/{id}/tv_credits`
// calls or `append_to_response` on the details request above: one HTTP
// request either way, but keeping it a separate query gives Filmography
// its own cache entry, its own error isolation (a credits failure doesn't
// take down the person's identity content), and mirrors every other
// detail page's "primary details request, separate secondary-content
// requests" shape (see docs/media-provider.md).
export async function getPersonCombinedCredits(
  id: number,
  options: MediaQueryOptions = {},
): Promise<PersonCredits> {
  const raw = await tmdbFetch(`/person/${id}/combined_credits`, {
    query: { language: options.language ?? DEFAULT_LANGUAGE },
    signal: options.signal,
    next: { revalidate: DETAILS_REVALIDATE_SECONDS },
  });
  return mapPersonCombinedCredits(validate(tmdbPersonCombinedCreditsResponseSchema, raw));
}
