// Application-owned media domain models. These are what the rest of the
// app deals with — never a raw TMDB (or any future provider's) response
// shape. Provider DTOs and field names (`poster_path`, `first_air_date`,
// ...) stay inside `src/server/tmdb/`; see docs/media-provider.md.

export type MediaType = "movie" | "show";

// A provider image path, not a resolved URL — building a real <img> src
// (with a size) is `src/server/tmdb/images.ts`'s job, kept separate so
// this type doesn't encode any provider-specific CDN/size behavior.
export type MediaImage = {
  path: string;
};

export type Genre = {
  id: number;
  name: string;
};

type MediaCommon = {
  // The external provider's numeric ID — not one of our own database IDs.
  // See docs/media-provider.md ("Identifiers") before using this anywhere
  // near application-owned data.
  id: number;
  title: string;
  originalTitle: string;
  overview: string | null;
  // ISO date string (YYYY-MM-DD) as TMDB sent it, or null when TMDB has no
  // date on file. Not a Date/timestamp — this is a date-only value with no
  // meaningful timezone, and formatting is a presentation concern.
  releaseDate: string | null;
  releaseYear: number | null;
  poster: MediaImage | null;
  backdrop: MediaImage | null;
  // TMDB's community vote average — provider metadata, never our own
  // user's personal rating. Deliberately not named `rating`.
  providerRating: number;
  voteCount: number;
  genreIds: readonly number[];
  adult: boolean;
};

export type MovieSummary = MediaCommon & { mediaType: "movie" };
export type ShowSummary = MediaCommon & { mediaType: "show" };

// A compact representation for search results, trending rows, and grids.
// `mediaType` discriminates movie vs. show wherever the difference matters
// later (routing, detail-fetching); shared fields are shaped identically.
export type MediaSummary = MovieSummary | ShowSummary;

export type ProductionCountry = {
  code: string;
  name: string;
};

type MediaDetailsCommon = {
  id: number;
  title: string;
  originalTitle: string;
  overview: string | null;
  tagline: string | null;
  // The provider's own status ("Released" for a movie; "Returning
  // Series"/"Ended"/"Canceled"/"In Production"/... for a show) —
  // application/provider metadata, categorically separate from a future
  // personal watch status ("Watching", "Caught up", ...). See
  // docs/media-provider.md, "Show status vs. watch status".
  status: string;
  genres: readonly Genre[];
  poster: MediaImage | null;
  backdrop: MediaImage | null;
  providerRating: number;
  voteCount: number;
  originalLanguage: string;
};

// The franchise collection a movie belongs to (e.g. "The Dark Knight
// Collection"), or null when it isn't part of one. Just the reference —
// the other movies in it are a separate, optional fetch
// (`getCollectionMovies`) powering Movie Details' "Part of…" row.
export type MovieCollection = {
  id: number;
  name: string;
  poster: MediaImage | null;
  backdrop: MediaImage | null;
};

export type MovieDetails = MediaDetailsCommon & {
  mediaType: "movie";
  releaseDate: string | null;
  releaseYear: number | null;
  // Minutes, or null when TMDB has no runtime on file (it sends `0`,
  // which isn't a real movie length — see the mapper).
  runtimeMinutes: number | null;
  productionCountries: readonly ProductionCountry[];
  collection: MovieCollection | null;
};

export type SeasonSummary = {
  id: number;
  seasonNumber: number;
  title: string;
  overview: string | null;
  airDate: string | null;
  episodeCount: number;
  poster: MediaImage | null;
};

export type ShowDetails = MediaDetailsCommon & {
  mediaType: "show";
  firstAirDate: string | null;
  firstAirYear: number | null;
  lastAirDate: string | null;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  // Minutes, or null — TMDB's `episode_run_time` is an array (historically
  // one figure per differing cut); we surface the first entry as a
  // best-effort typical runtime, or null when the array is empty.
  episodeRuntimeMinutes: number | null;
  seasons: readonly SeasonSummary[];
  // Usually one or two people. Carries an id (not just a name) so a
  // creator's name can link to `/people/[id]` — see docs/architecture.md,
  // "People".
  creators: readonly CreditedPerson[];
  // TMDB's own next/most-recent episode-to-air, straight from the same
  // Show Details response — no extra fetch. The one cheap, reliable
  // signal for "is a future episode actually scheduled" (see
  // docs/tracking.md, `hasKnownFutureEpisode`) and Calendar's release
  // intelligence (see docs/calendar.md). `null` means TMDB has nothing
  // scheduled/on file, never "unknown" vs "definitely none" — that
  // distinction isn't available from this field.
  nextEpisodeToAir: Episode | null;
  lastEpisodeToAir: Episode | null;
};

export type MediaDetails = MovieDetails | ShowDetails;

export type Episode = {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview: string | null;
  runtimeMinutes: number | null;
  airDate: string | null;
  still: MediaImage | null;
  providerRating: number;
};

export type SeasonDetails = {
  showId: number;
  id: number;
  seasonNumber: number;
  title: string;
  overview: string | null;
  airDate: string | null;
  poster: MediaImage | null;
  episodes: readonly Episode[];
};

// A generic paginated result shape for provider list endpoints — never
// TMDB's own `results`/`total_pages` naming outside the integration.
export type Pagination<T> = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: readonly T[];
};

// A cast member on a Movie Details page — deliberately minimal (see
// docs/media-provider.md): the Cast row itself only renders these fields.
// `id` is also what makes the tile navigable to `/people/[id]` — see
// docs/architecture.md, "People".
export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile: MediaImage | null;
};

// A name plus the provider person ID it links to — used wherever Movie/
// Show Details surfaces a crew member's name inline (a movie's director,
// a show's creators) rather than in a full cast-style tile. Not a general
// Crew domain model — these are the two specific credits the product
// intentionally surfaces near a title's main metadata (see
// docs/media-provider.md).
export type CreditedPerson = {
  id: number;
  name: string;
};

export type MovieCredits = {
  cast: readonly CastMember[];
  // Usually one name; co-directed films can have more.
  directors: readonly CreditedPerson[];
};

// A cast member from TMDB's *aggregate* TV credits — representative of a
// person's role across the show's full run, not just its latest season
// (see docs/media-provider.md, "TV credits"). `character` is the
// person's primary/first credited role; a person playing more than one
// role over a show's run is rare enough not to warrant modeling a full
// roles list here.
export type ShowCastMember = {
  id: number;
  name: string;
  character: string;
  profile: MediaImage | null;
};

export type ShowCredits = {
  cast: readonly ShowCastMember[];
};

// A single selected trailer — `selectTrailer` (src/server/tmdb/mappers.ts)
// picks the one best video from TMDB's list; the domain layer never deals
// with "which of these N videos should we show".
export type Trailer = {
  key: string;
  name: string;
};

// A person is external provider metadata, same as a movie/show — never
// persisted to PostgreSQL (see docs/media-provider.md, "People"; the
// application database owns user-owned state only). Deliberately lean:
// only fields the Person page's identity/header actually renders.
// `knownForDepartment` is TMDB's own professional classification
// ("Acting", "Directing", "Writing", "Production", ...) — used to order
// Filmography sections (see server/people/compose.ts), never rendered as
// a badge itself.
export type Person = {
  id: number;
  name: string;
  profile: MediaImage | null;
  biography: string | null;
  knownForDepartment: string | null;
  birthday: string | null;
  deathday: string | null;
  birthplace: string | null;
};

// A single movie/show a person is credited on — the shared shape between
// an acting and a crew credit. Deliberately leaner than `MediaSummary`:
// Filmography/Known For only ever render title/year/poster/role context,
// never overview/genres/rating, so those fields are never fetched or
// carried (see docs/media-provider.md). `voteCount` is the one exception:
// carried purely as an internal signal for ranking Known For
// (server/people/compose.ts) and never rendered — the same "provider
// number used for sorting, not shown" precedent as Discover's top-rated
// `vote_count.gte` floor.
export type PersonMediaCredit = {
  mediaType: MediaType;
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  year: number | null;
  voteCount: number;
};

export type PersonCastCredit = PersonMediaCredit & {
  character: string | null;
  // TV credits only — see PersonMediaCredit and docs/media-provider.md.
  episodeCount: number | null;
};

export type PersonCrewCredit = PersonMediaCredit & {
  // TMDB's raw job title ("Director", "Executive Producer", "Screenplay",
  // ...) — server/people/compose.ts normalizes these into the product's
  // own Directing/Writing/Producing grouping; UI never sees a raw job
  // string without going through that step first.
  job: string;
  department: string;
};

export type PersonCredits = {
  cast: readonly PersonCastCredit[];
  crew: readonly PersonCrewCredit[];
};
