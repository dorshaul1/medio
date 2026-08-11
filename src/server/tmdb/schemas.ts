import { z } from "zod";

// Validates only the fields we actually consume from each TMDB response.
// `z.object()` strips unrecognized keys by default (Zod doesn't error on
// them), so TMDB adding fields never breaks us. Fields TMDB is documented
// to send as `null` when absent (image paths, dates it uses `""` for) are
// modeled that way rather than made `.optional()` — see docs/media-provider.md.

export const tmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const tmdbGenreListResponseSchema = z.object({
  genres: z.array(tmdbGenreSchema),
});

// Shared shape between search results and trending items — both endpoints
// return the same movie/show result object.
export const tmdbMovieResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string(),
  overview: z.string(),
  release_date: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
  genre_ids: z.array(z.number()),
  adult: z.boolean(),
});

export const tmdbShowResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string(),
  overview: z.string(),
  first_air_date: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
  genre_ids: z.array(z.number()),
  // Unlike movie results, TV list endpoints don't consistently send `adult`
  // (e.g. /tv/popular omits it) — optional here, mapped to `false` when
  // absent rather than rejecting the whole response over a field we only
  // use as a content flag.
  adult: z.boolean().optional(),
});

export const tmdbMovieSearchResponseSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  total_results: z.number(),
  results: z.array(tmdbMovieResultSchema),
});

export const tmdbShowSearchResponseSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  total_results: z.number(),
  results: z.array(tmdbShowResultSchema),
});

export const tmdbProductionCountrySchema = z.object({
  iso_3166_1: z.string(),
  name: z.string(),
});

// The lightweight reference embedded in a movie details response — TMDB
// sends `null` when the movie isn't part of a franchise collection.
export const tmdbCollectionReferenceSchema = z.object({
  id: z.number(),
  name: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
});

export const tmdbMovieDetailsSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string(),
  overview: z.string(),
  tagline: z.string(),
  release_date: z.string(),
  runtime: z.number().nullable(),
  status: z.string(),
  genres: z.array(tmdbGenreSchema),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
  original_language: z.string(),
  production_countries: z.array(tmdbProductionCountrySchema),
  adult: z.boolean(),
  belongs_to_collection: tmdbCollectionReferenceSchema.nullable(),
});

// The full `/collection/{id}` response — only fetched when a movie's own
// details named a `belongs_to_collection`. `parts` shares the exact same
// shape as a movie search/trending result, so it's validated and mapped
// with the same `tmdbMovieResultSchema`/`mapTmdbMovieSummary` rather than
// a second parallel schema.
export const tmdbCollectionDetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  parts: z.array(tmdbMovieResultSchema),
});

export const tmdbSeasonSummarySchema = z.object({
  id: z.number(),
  season_number: z.number(),
  name: z.string(),
  overview: z.string(),
  air_date: z.string().nullable(),
  episode_count: z.number(),
  poster_path: z.string().nullable(),
});

const tmdbCreatorSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Defined before `tmdbShowDetailsSchema` so `next_episode_to_air`/
// `last_episode_to_air` below can reuse it directly — those two objects
// share the exact same shape TMDB's season-episode objects use.
export const tmdbEpisodeSchema = z.object({
  id: z.number(),
  episode_number: z.number(),
  season_number: z.number(),
  name: z.string(),
  overview: z.string(),
  runtime: z.number().nullable(),
  air_date: z.string().nullable(),
  still_path: z.string().nullable(),
  vote_average: z.number(),
});

export const tmdbShowDetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string(),
  overview: z.string(),
  tagline: z.string(),
  first_air_date: z.string(),
  last_air_date: z.string().nullable(),
  status: z.string(),
  genres: z.array(tmdbGenreSchema),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
  original_language: z.string(),
  number_of_seasons: z.number(),
  number_of_episodes: z.number(),
  episode_run_time: z.array(z.number()),
  seasons: z.array(tmdbSeasonSummarySchema),
  created_by: z.array(tmdbCreatorSchema),
  // Powers Calendar/Waiting-state (see docs/calendar.md). TMDB's own docs
  // are ambiguous about whether an absent value comes back as `null` or
  // `{}` — `.catch(null)` degrades any unparseable shape to "unknown"
  // rather than failing the whole Show Details parse over this one field.
  next_episode_to_air: tmdbEpisodeSchema.nullable().catch(null),
  last_episode_to_air: tmdbEpisodeSchema.nullable().catch(null),
});

export const tmdbSeasonDetailsSchema = z.object({
  id: z.number(),
  season_number: z.number(),
  name: z.string(),
  overview: z.string(),
  air_date: z.string().nullable(),
  poster_path: z.string().nullable(),
  episodes: z.array(tmdbEpisodeSchema),
});

export const tmdbCastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string(),
  profile_path: z.string().nullable(),
  order: z.number(),
});

export const tmdbCrewMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string(),
  department: z.string(),
});

export const tmdbCreditsResponseSchema = z.object({
  cast: z.array(tmdbCastMemberSchema),
  crew: z.array(tmdbCrewMemberSchema),
});

export const tmdbVideoSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  site: z.string(),
  type: z.string(),
  official: z.boolean(),
});

export const tmdbVideosResponseSchema = z.object({
  results: z.array(tmdbVideoSchema),
});

// TMDB's *aggregate* TV credits (`/tv/{id}/aggregate_credits`) — each
// cast member carries every character they've played across the show's
// run as a `roles` array, rather than one `character` string. Preferred
// over the regular `/tv/{id}/credits` endpoint for Show Details' cast
// section because the regular endpoint only reflects the latest season
// (see docs/media-provider.md, "TV credits").
const tmdbAggregateCastRoleSchema = z.object({
  character: z.string(),
  episode_count: z.number(),
});

export const tmdbAggregateCastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: z.string().nullable(),
  roles: z.array(tmdbAggregateCastRoleSchema),
  order: z.number(),
});

export const tmdbAggregateCreditsResponseSchema = z.object({
  cast: z.array(tmdbAggregateCastMemberSchema),
});

// `/person/{id}` — only the fields the Person page actually renders (see
// docs/media-provider.md, "Person"). TMDB's person object also carries
// `popularity`, `imdb_id`, `homepage`, `also_known_as`,
// `external_ids`-style fields — none of those are fetched or validated,
// since nothing in the product surfaces them (this phase deliberately
// excludes social/external-ID data). TMDB sends `""` for an unset
// biography and `null` for unset birthday/deathday/place_of_birth —
// modeled as sent, normalized to a single honest `null` by the mapper.
export const tmdbPersonDetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  biography: z.string(),
  birthday: z.string().nullable(),
  deathday: z.string().nullable(),
  place_of_birth: z.string().nullable(),
  profile_path: z.string().nullable(),
  known_for_department: z.string().nullable(),
});

// `/person/{id}/combined_credits` — a person's acting (cast) and crew
// credits across both movies and TV in one request (see
// docs/media-provider.md, "Person credits" — chosen over separate movie/tv
// credit calls or `append_to_response` for request-count/caching reasons).
// Each entry is a movie or a tv credit, discriminated by `media_type`;
// `title`/`release_date` (movie) and `name`/`first_air_date` (tv) are
// modeled as optional rather than as two parallel schemas, since TMDB
// returns them in one flat array per role — the mapper picks the right
// field per entry. Only the fields the Filmography/Known For sections
// actually use are validated: `vote_count` is kept solely as an internal,
// never-rendered signal for ranking Known For (see server/people/compose.ts);
// popularity, genres, overview, and every other field TMDB sends on these
// objects are not fetched.
const tmdbPersonCreditBaseSchema = z.object({
  id: z.number(),
  media_type: z.enum(["movie", "tv"]),
  title: z.string().optional(),
  name: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  poster_path: z.string().nullable(),
  vote_count: z.number().optional(),
  // TV-only, cast credits only — how many episodes this role appeared in,
  // used to distinguish a main cast member from a brief guest spot (see
  // docs/media-provider.md).
  episode_count: z.number().optional(),
});

export const tmdbPersonCastCreditSchema = tmdbPersonCreditBaseSchema.extend({
  character: z.string().optional(),
});

export const tmdbPersonCrewCreditSchema = tmdbPersonCreditBaseSchema.extend({
  job: z.string().optional(),
  department: z.string().optional(),
});

export const tmdbPersonCombinedCreditsResponseSchema = z.object({
  cast: z.array(tmdbPersonCastCreditSchema),
  crew: z.array(tmdbPersonCrewCreditSchema),
});

// `/search/person` — see docs/media-provider.md, "People search". TMDB's
// `known_for` embeds a few of the person's own best-known movie/TV
// credits (mixed shapes in one array, same `media_type`-discriminated
// pattern as person combined-credits above) — cheap because it's already
// part of this one response, not a second fetch. Only the fields Search's
// People result actually renders are validated, same discipline as every
// other schema here.
export const tmdbPersonKnownForItemSchema = z.object({
  id: z.number(),
  media_type: z.enum(["movie", "tv"]),
  title: z.string().optional(),
  name: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  poster_path: z.string().nullable(),
});

export const tmdbPersonSearchResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: z.string().nullable(),
  known_for_department: z.string().nullable(),
  popularity: z.number(),
  known_for: z.array(tmdbPersonKnownForItemSchema),
});

export const tmdbPersonSearchResponseSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  total_results: z.number(),
  results: z.array(tmdbPersonSearchResultSchema),
});
