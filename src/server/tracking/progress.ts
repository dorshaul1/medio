// Pure, synchronous, no I/O — every function here just reshapes episode
// watch events + a normalized episode list into progress facts. Never
// calls TMDB, never touches the database. Callers gather the episode
// inventory (from `src/server/tmdb/queries.ts`, an already
// application-owned `Episode[]`, never a TMDB DTO) and the event rows
// separately; see docs/tracking.md, "Progress input boundary".
import type { Episode } from "@/server/media/types";
import type { EpisodeCoordinate, EpisodeWatchEvent } from "./types";

function episodeKey(coordinate: EpisodeCoordinate): string {
  return `${coordinate.seasonNumber}:${coordinate.episodeNumber}`;
}

// An episode counts as "aired" only with a real air date on or before
// `asOf` — a missing air date is conservatively treated as not yet aired,
// never as "aired" by default (see docs/tracking.md, "Unknown air dates").
function hasAired(airDate: string | null, asOf: Date): boolean {
  if (!airDate) return false;
  return new Date(`${airDate}T00:00:00Z`).getTime() <= asOf.getTime();
}

// Regular seasons (excludes Specials/season 0 — see docs/tracking.md,
// "Specials") that have actually aired. This is the standard progress
// denominator everywhere in this module.
export function relevantAiredEpisodes(
  episodes: readonly Episode[],
  asOf: Date = new Date(),
): readonly Episode[] {
  return episodes.filter(
    (episode) => episode.seasonNumber !== 0 && hasAired(episode.airDate, asOf),
  );
}

// Rewatches must not inflate progress — this collapses N events for the
// same episode down to one unique identity. Matches by season/episode
// number (what the caller's episode inventory itself carries), not by
// TMDB's separate numeric episode ID.
export function uniqueWatchedEpisodeKeys(
  events: readonly EpisodeWatchEvent[],
): ReadonlySet<string> {
  return new Set(events.map((event) => episodeKey(event)));
}

// The most recently *watched* episode by `watchedAt` — not the
// highest-numbered one. A user can watch out of order or rewatch an
// earlier episode; history must reflect what actually happened, not an
// assumption about viewing order.
export function lastWatchedEpisode(
  events: readonly EpisodeWatchEvent[],
): (EpisodeCoordinate & { watchedAt: Date }) | null {
  if (events.length === 0) return null;

  const latest = events.reduce((latest, event) =>
    event.watchedAt.getTime() > latest.watchedAt.getTime() ? event : latest,
  );
  return {
    seasonNumber: latest.seasonNumber,
    episodeNumber: latest.episodeNumber,
    watchedAt: latest.watchedAt,
  };
}

function compareEpisodeOrder(a: Episode, b: Episode): number {
  if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
  return a.episodeNumber - b.episodeNumber;
}

// The next currently-unwatched aired regular episode, in canonical
// (season, episode) order — never inferred from watch-event creation
// order. Not yet a UI concept ("Up Next" is reserved for a future
// product surface); this is domain-layer support for it.
export function nextUnwatchedEpisode(input: {
  episodes: readonly Episode[];
  events: readonly EpisodeWatchEvent[];
  asOf?: Date;
}): EpisodeCoordinate | null {
  const watched = uniqueWatchedEpisodeKeys(input.events);
  const ordered = relevantAiredEpisodes(input.episodes, input.asOf)
    .slice()
    .sort(compareEpisodeOrder);
  const next = ordered.find((episode) => !watched.has(episodeKey(episode)));
  return next ? { seasonNumber: next.seasonNumber, episodeNumber: next.episodeNumber } : null;
}
