import "server-only";
import type { MovieDetails, SeasonDetails, ShowDetails } from "@/server/media/types";
import { getMovieDetails, getSeasonDetails, getShowDetails } from "@/server/tmdb/queries";
import type { DiaryEntry, DiaryEvent, EpisodeDiaryEvent, MovieDiaryEvent } from "./types";

function isMovieEvent(event: DiaryEvent): event is MovieDiaryEvent {
  return event.eventType === "movie";
}

function isEpisodeEvent(event: DiaryEvent): event is EpisodeDiaryEvent {
  return event.eventType === "episode";
}

function dedupe<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function seasonKey(showProviderId: number, seasonNumber: number): string {
  return `${showProviderId}:${seasonNumber}`;
}

// Fetches each distinct id at most once, in parallel, and never lets one
// failure take the others down with it — a missing map entry means that
// one title's provider hydration failed (a live TMDB error, or the title
// having since become unavailable). Diary history is user-owned and real
// regardless of whether TMDB can currently describe it — the event
// itself is never touched because of a hydration failure, and no title
// is ever fabricated for it; the caller renders a restrained
// "unavailable" entry instead (see docs/diary.md, "Provider failure" —
// the same graceful-degradation contract `server/library/compose.ts`
// already applies to Library rows).
async function fetchAllById<T>(
  ids: readonly number[],
  fetchOne: (id: number) => Promise<T>,
): Promise<ReadonlyMap<number, T>> {
  const results = await Promise.all(
    ids.map(async (id): Promise<readonly [number, T] | null> => {
      try {
        return [id, await fetchOne(id)];
      } catch {
        return null;
      }
    }),
  );
  return new Map(results.filter((entry): entry is readonly [number, T] => entry !== null));
}

async function hydrateSeasons(
  seasonKeys: readonly string[],
): Promise<ReadonlyMap<string, SeasonDetails>> {
  const results = await Promise.all(
    seasonKeys.map(async (key): Promise<readonly [string, SeasonDetails] | null> => {
      const [showIdText, seasonNumberText] = key.split(":");
      const showId = Number(showIdText);
      const seasonNumber = Number(seasonNumberText);
      try {
        return [key, await getSeasonDetails(showId, seasonNumber)];
      } catch {
        return null;
      }
    }),
  );
  return new Map(
    results.filter((entry): entry is readonly [string, SeasonDetails] => entry !== null),
  );
}

function toMovieEntry(
  event: MovieDiaryEvent,
  movieById: ReadonlyMap<number, MovieDetails>,
): DiaryEntry {
  const movie = movieById.get(event.movieProviderId);
  if (!movie) {
    return {
      kind: "unavailable",
      eventType: "movie",
      id: event.id,
      watchedAt: event.watchedAt,
      ordinal: event.ordinal,
      movieProviderId: event.movieProviderId,
    };
  }
  return {
    kind: "movie",
    id: event.id,
    watchedAt: event.watchedAt,
    ordinal: event.ordinal,
    movieProviderId: event.movieProviderId,
    title: movie.title,
    year: movie.releaseYear,
    poster: movie.poster,
  };
}

function toEpisodeEntry(
  event: EpisodeDiaryEvent,
  showById: ReadonlyMap<number, ShowDetails>,
  seasonByKey: ReadonlyMap<string, SeasonDetails>,
): DiaryEntry {
  const show = showById.get(event.showProviderId);
  const season = seasonByKey.get(seasonKey(event.showProviderId, event.seasonNumber));
  // Matched by the episode's own canonical provider id, not by
  // episode number — the identity a `SeasonDetails` response actually
  // carries per episode (see docs/media-provider.md, "Identifiers").
  const episode = season?.episodes.find((candidate) => candidate.id === event.episodeProviderId);

  if (!show || !episode) {
    return {
      kind: "unavailable",
      eventType: "episode",
      id: event.id,
      watchedAt: event.watchedAt,
      ordinal: event.ordinal,
      showProviderId: event.showProviderId,
      seasonNumber: event.seasonNumber,
      episodeNumber: event.episodeNumber,
    };
  }

  return {
    kind: "episode",
    id: event.id,
    watchedAt: event.watchedAt,
    ordinal: event.ordinal,
    showProviderId: event.showProviderId,
    seasonNumber: event.seasonNumber,
    episodeNumber: event.episodeNumber,
    episodeProviderId: event.episodeProviderId,
    showTitle: show.title,
    episodeTitle: episode.title,
    showPoster: show.poster,
    episodeStill: episode.still,
  };
}

// Hydrates one bounded, already-paginated page of raw Diary events with
// real provider metadata — the one place Diary composes tracking
// identity with TMDB data (see docs/diary.md, "Provider hydration").
// Deliberately never one provider request per event: every distinct
// movie on the page is fetched once, every distinct show is fetched
// once, and every distinct show+season pair is fetched once
// (`getSeasonDetails`) and reused to resolve every visible episode entry
// in that season — five Diary events from the same season cost one
// Season fetch, not five (see docs/diary.md, "Episode hydration"). TMDB's
// own `next: { revalidate }` fetch caching (see `server/tmdb/queries.ts`)
// still applies underneath this — this layer's own deduplication is
// about never issuing the *redundant* requests in the first place, not a
// replacement for that cache.
export async function hydrateDiaryEvents(
  events: readonly DiaryEvent[],
): Promise<readonly DiaryEntry[]> {
  const movieEvents = events.filter(isMovieEvent);
  const episodeEvents = events.filter(isEpisodeEvent);

  const movieIds = dedupe(movieEvents.map((event) => event.movieProviderId));
  const showIds = dedupe(episodeEvents.map((event) => event.showProviderId));
  const seasonKeys = dedupe(
    episodeEvents.map((event) => seasonKey(event.showProviderId, event.seasonNumber)),
  );

  const [movieById, showById, seasonByKey] = await Promise.all([
    fetchAllById(movieIds, (id) => getMovieDetails(id)),
    fetchAllById(showIds, (id) => getShowDetails(id)),
    hydrateSeasons(seasonKeys),
  ]);

  return events.map((event) =>
    event.eventType === "movie"
      ? toMovieEntry(event, movieById)
      : toEpisodeEntry(event, showById, seasonByKey),
  );
}
