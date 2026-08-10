// Pure construction of ReleaseEvents from already-hydrated provider data
// plus a known personal relevance tier — no I/O, no session access. Kept
// separate from compose.ts (the I/O orchestrator) so this shaping logic
// is directly unit-testable without mocking TMDB or the database, the
// same split as this directory's other pure modules (date.ts, group.ts,
// rank.ts, timeline.ts) — see docs/calendar.md.
import type { Episode, MovieDetails, ShowDetails } from "@/server/media/types";
import { hasAired } from "./date";
import type { EpisodeReleaseEvent, MovieReleaseEvent, ReleaseRelevance } from "./types";

// Builds one EpisodeReleaseEvent from a single episode TMDB already
// reports an air date for. Returns `null` when the episode has no air
// date on file yet — a real, common "not yet scheduled" case (see
// docs/calendar.md, "Episode airing semantics"), and an event with no
// date can't be placed on a timeline at all.
export function buildEpisodeReleaseEvent(
  show: ShowDetails,
  episode: Episode,
  relevance: ReleaseRelevance,
  now: Date,
): EpisodeReleaseEvent | null {
  if (!episode.airDate) return null;

  return {
    kind: "episode",
    date: episode.airDate,
    relevance,
    hasAired: hasAired(episode.airDate, now),
    showProviderId: show.id,
    showTitle: show.title,
    poster: show.poster,
    backdrop: show.backdrop,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    episodeProviderId: episode.id,
    episodeTitle: episode.title,
    still: episode.still,
    runtimeMinutes: episode.runtimeMinutes,
    isSeasonPremiere: episode.episodeNumber === 1,
    isShowPremiere: episode.seasonNumber === 1 && episode.episodeNumber === 1,
  };
}

// Builds one MovieReleaseEvent, or `null` when TMDB has no release date
// on file (a real "TBA" case, never fabricated — see docs/calendar.md,
// "Movie release semantics").
export function buildMovieReleaseEvent(
  movie: MovieDetails,
  relevance: ReleaseRelevance,
  now: Date,
): MovieReleaseEvent | null {
  if (!movie.releaseDate) return null;

  return {
    kind: "movieRelease",
    date: movie.releaseDate,
    relevance,
    hasAired: hasAired(movie.releaseDate, now),
    movieProviderId: movie.id,
    movieTitle: movie.title,
    poster: movie.poster,
    backdrop: movie.backdrop,
  };
}
