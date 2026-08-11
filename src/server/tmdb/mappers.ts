import type { z } from "zod";
import type {
  CastMember,
  CreditedPerson,
  Episode,
  Genre,
  MediaImage,
  MediaSummary,
  MovieCollection,
  MovieCredits,
  MovieDetails,
  Person,
  PersonCastCredit,
  PersonCredits,
  PersonCrewCredit,
  PersonKnownForItem,
  PersonMediaCredit,
  PersonSummary,
  ProductionCountry,
  SeasonDetails,
  SeasonSummary,
  ShowCastMember,
  ShowCredits,
  ShowDetails,
  Trailer,
} from "@/server/media/types";
import type {
  tmdbAggregateCastMemberSchema,
  tmdbAggregateCreditsResponseSchema,
  tmdbCastMemberSchema,
  tmdbCollectionReferenceSchema,
  tmdbCreditsResponseSchema,
  tmdbEpisodeSchema,
  tmdbGenreSchema,
  tmdbMovieDetailsSchema,
  tmdbMovieResultSchema,
  tmdbPersonCastCreditSchema,
  tmdbPersonCombinedCreditsResponseSchema,
  tmdbPersonCrewCreditSchema,
  tmdbPersonDetailsSchema,
  tmdbPersonKnownForItemSchema,
  tmdbPersonSearchResultSchema,
  tmdbProductionCountrySchema,
  tmdbSeasonDetailsSchema,
  tmdbSeasonSummarySchema,
  tmdbShowDetailsSchema,
  tmdbShowResultSchema,
  tmdbVideoSchema,
} from "./schemas";

// Pure, synchronous, no I/O — every function here just reshapes an
// already-validated TMDB object into an application-owned domain model.
// See docs/media-provider.md for the "why" behind these normalizations.

type TmdbMovieResult = z.infer<typeof tmdbMovieResultSchema>;
type TmdbShowResult = z.infer<typeof tmdbShowResultSchema>;
type TmdbGenre = z.infer<typeof tmdbGenreSchema>;
type TmdbProductionCountry = z.infer<typeof tmdbProductionCountrySchema>;
type TmdbMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>;
type TmdbShowDetails = z.infer<typeof tmdbShowDetailsSchema>;
type TmdbSeasonSummary = z.infer<typeof tmdbSeasonSummarySchema>;
type TmdbSeasonDetails = z.infer<typeof tmdbSeasonDetailsSchema>;
type TmdbEpisode = z.infer<typeof tmdbEpisodeSchema>;
type TmdbCastMember = z.infer<typeof tmdbCastMemberSchema>;
type TmdbCreditsResponse = z.infer<typeof tmdbCreditsResponseSchema>;
type TmdbVideo = z.infer<typeof tmdbVideoSchema>;
type TmdbCollectionReference = z.infer<typeof tmdbCollectionReferenceSchema>;
type TmdbAggregateCastMember = z.infer<typeof tmdbAggregateCastMemberSchema>;
type TmdbAggregateCreditsResponse = z.infer<typeof tmdbAggregateCreditsResponseSchema>;
type TmdbPersonDetails = z.infer<typeof tmdbPersonDetailsSchema>;
type TmdbPersonCastCredit = z.infer<typeof tmdbPersonCastCreditSchema>;
type TmdbPersonCrewCredit = z.infer<typeof tmdbPersonCrewCreditSchema>;
type TmdbPersonCombinedCreditsResponse = z.infer<typeof tmdbPersonCombinedCreditsResponseSchema>;
type TmdbPersonSearchResult = z.infer<typeof tmdbPersonSearchResultSchema>;
type TmdbPersonKnownForItem = z.infer<typeof tmdbPersonKnownForItemSchema>;

// TMDB uses `""` for "no date on file", not `null` — normalize both to a
// real absence.
function nullableDate(value: string): string | null {
  return value.length > 0 ? value : null;
}

function nullableText(value: string): string | null {
  return value.length > 0 ? value : null;
}

function yearFromDate(date: string | null): number | null {
  if (!date) return null;
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

function mediaImage(path: string | null | undefined): MediaImage | null {
  return path ? { path } : null;
}

// TMDB sends `0` for "unknown runtime", not `null` — a real 0-minute movie
// or episode doesn't exist.
function positiveMinutes(value: number | null | undefined): number | null {
  return value && value > 0 ? value : null;
}

export function mapTmdbGenre(genre: TmdbGenre): Genre {
  return { id: genre.id, name: genre.name };
}

function mapProductionCountry(country: TmdbProductionCountry): ProductionCountry {
  return { code: country.iso_3166_1, name: country.name };
}

export function mapTmdbMovieSummary(movie: TmdbMovieResult): MediaSummary {
  const releaseDate = nullableDate(movie.release_date);
  return {
    mediaType: "movie",
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: nullableText(movie.overview),
    releaseDate,
    releaseYear: yearFromDate(releaseDate),
    poster: mediaImage(movie.poster_path),
    backdrop: mediaImage(movie.backdrop_path),
    providerRating: movie.vote_average,
    voteCount: movie.vote_count,
    genreIds: movie.genre_ids,
    adult: movie.adult,
  };
}

export function mapTmdbShowSummary(show: TmdbShowResult): MediaSummary {
  const releaseDate = nullableDate(show.first_air_date);
  return {
    mediaType: "show",
    id: show.id,
    title: show.name,
    originalTitle: show.original_name,
    overview: nullableText(show.overview),
    releaseDate,
    releaseYear: yearFromDate(releaseDate),
    poster: mediaImage(show.poster_path),
    backdrop: mediaImage(show.backdrop_path),
    providerRating: show.vote_average,
    voteCount: show.vote_count,
    genreIds: show.genre_ids,
    adult: show.adult ?? false,
  };
}

function mapCollectionReference(collection: TmdbCollectionReference): MovieCollection {
  return {
    id: collection.id,
    name: collection.name,
    poster: mediaImage(collection.poster_path),
    backdrop: mediaImage(collection.backdrop_path),
  };
}

export function mapTmdbMovieDetails(movie: TmdbMovieDetails): MovieDetails {
  const releaseDate = nullableDate(movie.release_date);
  return {
    mediaType: "movie",
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: nullableText(movie.overview),
    tagline: nullableText(movie.tagline),
    releaseDate,
    releaseYear: yearFromDate(releaseDate),
    runtimeMinutes: positiveMinutes(movie.runtime),
    status: movie.status,
    genres: movie.genres.map(mapTmdbGenre),
    poster: mediaImage(movie.poster_path),
    backdrop: mediaImage(movie.backdrop_path),
    providerRating: movie.vote_average,
    voteCount: movie.vote_count,
    originalLanguage: movie.original_language,
    productionCountries: movie.production_countries.map(mapProductionCountry),
    collection: movie.belongs_to_collection
      ? mapCollectionReference(movie.belongs_to_collection)
      : null,
  };
}

function mapSeasonSummary(season: TmdbSeasonSummary): SeasonSummary {
  return {
    id: season.id,
    seasonNumber: season.season_number,
    title: season.name,
    overview: nullableText(season.overview),
    airDate: nullableDate(season.air_date ?? ""),
    episodeCount: season.episode_count,
    poster: mediaImage(season.poster_path),
  };
}

export function mapTmdbShowDetails(show: TmdbShowDetails): ShowDetails {
  const firstAirDate = nullableDate(show.first_air_date);
  return {
    mediaType: "show",
    id: show.id,
    title: show.name,
    originalTitle: show.original_name,
    overview: nullableText(show.overview),
    tagline: nullableText(show.tagline),
    firstAirDate,
    firstAirYear: yearFromDate(firstAirDate),
    lastAirDate: nullableDate(show.last_air_date ?? ""),
    status: show.status,
    genres: show.genres.map(mapTmdbGenre),
    poster: mediaImage(show.poster_path),
    backdrop: mediaImage(show.backdrop_path),
    providerRating: show.vote_average,
    voteCount: show.vote_count,
    originalLanguage: show.original_language,
    numberOfSeasons: show.number_of_seasons,
    numberOfEpisodes: show.number_of_episodes,
    episodeRuntimeMinutes: positiveMinutes(show.episode_run_time[0]),
    seasons: show.seasons.map(mapSeasonSummary),
    creators: show.created_by.map((creator) => ({ id: creator.id, name: creator.name })),
    nextEpisodeToAir: show.next_episode_to_air ? mapEpisode(show.next_episode_to_air) : null,
    lastEpisodeToAir: show.last_episode_to_air ? mapEpisode(show.last_episode_to_air) : null,
  };
}

function mapEpisode(episode: TmdbEpisode): Episode {
  return {
    id: episode.id,
    episodeNumber: episode.episode_number,
    seasonNumber: episode.season_number,
    title: episode.name,
    overview: nullableText(episode.overview),
    runtimeMinutes: positiveMinutes(episode.runtime),
    airDate: nullableDate(episode.air_date ?? ""),
    still: mediaImage(episode.still_path),
    providerRating: episode.vote_average,
  };
}

export function mapTmdbSeasonDetails(showId: number, season: TmdbSeasonDetails): SeasonDetails {
  return {
    showId,
    id: season.id,
    seasonNumber: season.season_number,
    title: season.name,
    overview: nullableText(season.overview),
    airDate: nullableDate(season.air_date ?? ""),
    poster: mediaImage(season.poster_path),
    episodes: season.episodes.map(mapEpisode),
  };
}

function mapCastMember(member: TmdbCastMember): CastMember {
  return {
    id: member.id,
    name: member.name,
    character: member.character,
    profile: mediaImage(member.profile_path),
  };
}

export function mapTmdbCredits(credits: TmdbCreditsResponse): MovieCredits {
  return {
    // TMDB already returns cast pre-sorted by billing order; a defensive
    // sort here would just re-derive the same thing from the field we're
    // not otherwise using, so we take the order as given.
    cast: credits.cast.map(mapCastMember),
    directors: credits.crew
      .filter((member) => member.job === "Director")
      .map((member): CreditedPerson => ({ id: member.id, name: member.name })),
  };
}

// Prefer, in order: an official trailer, any trailer, an official teaser.
// Only ever YouTube — the only site this product renders. Pure and
// deterministic, never a random pick among equally-ranked candidates
// (Array.prototype.find always returns the first match).
export function selectTrailer(videos: readonly TmdbVideo[]): TmdbVideo | null {
  const youtube = videos.filter((video) => video.site === "YouTube");
  return (
    youtube.find((video) => video.type === "Trailer" && video.official) ??
    youtube.find((video) => video.type === "Trailer") ??
    youtube.find((video) => video.type === "Teaser" && video.official) ??
    null
  );
}

export function mapTmdbVideoToTrailer(video: TmdbVideo): Trailer {
  return { key: video.key, name: video.name };
}

// A person's first-credited role stands in for `character` — TMDB's
// aggregate credits list every character a person has played across the
// show's run, but showing all of them in a compact cast tile is noise;
// see the ShowCastMember comment in server/media/types.ts. `roles` is
// occasionally empty (a crew-only credit surfaced without a role) —
// falls back to an empty string rather than throwing over it.
function mapAggregateCastMember(member: TmdbAggregateCastMember): ShowCastMember {
  return {
    id: member.id,
    name: member.name,
    character: member.roles[0]?.character ?? "",
    profile: mediaImage(member.profile_path),
  };
}

export function mapAggregateCredits(credits: TmdbAggregateCreditsResponse): ShowCredits {
  return {
    // TMDB already returns cast pre-sorted by billing order — see the
    // equivalent comment on mapTmdbCredits.
    cast: credits.cast.map(mapAggregateCastMember),
  };
}

export function mapTmdbPerson(person: TmdbPersonDetails): Person {
  return {
    id: person.id,
    name: person.name,
    profile: mediaImage(person.profile_path),
    biography: nullableText(person.biography),
    knownForDepartment: person.known_for_department,
    birthday: person.birthday,
    deathday: person.deathday,
    birthplace: person.place_of_birth,
  };
}

// Shared shape between a person's acting and crew credits — see
// PersonMediaCredit. Returns null for a credit with no usable media
// identity (TMDB occasionally returns a credit with neither `title` nor
// `name`, e.g. a removed/merged title) rather than rendering a blank row.
function mapPersonMediaCredit(
  credit: TmdbPersonCastCredit | TmdbPersonCrewCredit,
): PersonMediaCredit | null {
  const mediaType = credit.media_type === "movie" ? "movie" : "show";
  const title = credit.media_type === "movie" ? credit.title : credit.name;
  if (!title) return null;

  const date =
    credit.media_type === "movie"
      ? nullableDate(credit.release_date ?? "")
      : nullableDate(credit.first_air_date ?? "");

  return {
    mediaType,
    mediaProviderId: credit.id,
    title,
    poster: mediaImage(credit.poster_path),
    year: yearFromDate(date),
    voteCount: credit.vote_count ?? 0,
  };
}

export function mapPersonCastCredit(credit: TmdbPersonCastCredit): PersonCastCredit | null {
  const base = mapPersonMediaCredit(credit);
  if (!base) return null;
  return {
    ...base,
    character: nullableText(credit.character ?? ""),
    episodeCount: base.mediaType === "show" ? (credit.episode_count ?? null) : null,
  };
}

// A crew credit with no `job` isn't usable for the product's own
// Directing/Writing/Producing grouping (see server/people/compose.ts), so
// it's dropped here rather than surfaced with an empty label.
export function mapPersonCrewCredit(credit: TmdbPersonCrewCredit): PersonCrewCredit | null {
  const base = mapPersonMediaCredit(credit);
  if (!base || !credit.job) return null;
  return { ...base, job: credit.job, department: credit.department ?? "" };
}

export function mapPersonCombinedCredits(
  credits: TmdbPersonCombinedCreditsResponse,
): PersonCredits {
  return {
    cast: credits.cast
      .map(mapPersonCastCredit)
      .filter((credit): credit is PersonCastCredit => credit !== null),
    crew: credits.crew
      .map(mapPersonCrewCredit)
      .filter((credit): credit is PersonCrewCredit => credit !== null),
  };
}

// Same "no usable media identity, drop it" rule as mapPersonMediaCredit —
// a `known_for` entry with neither `title` nor `name` isn't renderable.
function mapPersonKnownForItem(item: TmdbPersonKnownForItem): PersonKnownForItem | null {
  const mediaType = item.media_type === "movie" ? "movie" : "show";
  const title = item.media_type === "movie" ? item.title : item.name;
  if (!title) return null;

  const date =
    item.media_type === "movie"
      ? nullableDate(item.release_date ?? "")
      : nullableDate(item.first_air_date ?? "");

  return { mediaType, mediaProviderId: item.id, title, year: yearFromDate(date) };
}

export function mapTmdbPersonSummary(person: TmdbPersonSearchResult): PersonSummary {
  return {
    id: person.id,
    name: person.name,
    profile: mediaImage(person.profile_path),
    knownForDepartment: person.known_for_department,
    popularity: person.popularity,
    knownFor: person.known_for
      .map(mapPersonKnownForItem)
      .filter((item): item is PersonKnownForItem => item !== null),
  };
}
