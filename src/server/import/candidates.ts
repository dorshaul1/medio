import "server-only";
import { eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { mediaComments } from "@/server/db/schema/opinions";
import type { PlanningIntentValue } from "@/server/db/schema/planning";
import { mediaPlanningItems } from "@/server/db/schema/planning";
import type { ShowTrackingStatusValue } from "@/server/db/schema/tracking";
import {
  episodeWatchEvents,
  movieWatchEvents,
  showTrackingState,
} from "@/server/db/schema/tracking";

function mediaKey(mediaType: string, providerId: number): string {
  return `${mediaType}:${providerId}`;
}

function episodeKey(showProviderId: number, seasonNumber: number, episodeNumber: number): string {
  return `${showProviderId}:${seasonNumber}:${episodeNumber}`;
}

// Every piece of the current user's own existing state that
// `server/import/plan.ts` needs to decide create/duplicate/conflict for
// each imported record — one bounded read per domain, selecting only
// the columns actually needed for comparison (never every column), scoped
// to this one user. Realistic even at tens of thousands of episode
// events (see docs/data-portability.md, "Large imports") — this is the
// same "bounded per-user reads" pattern Stats' own aggregates already
// use, and stays entirely server-side; the browser only ever sees the
// computed plan, never this raw comparison data.
export type ExistingUserState = {
  movieWatchedAtByMovie: ReadonlyMap<number, readonly Date[]>;
  episodeWatchedAtByEpisode: ReadonlyMap<string, readonly Date[]>;
  planningIntentByMedia: ReadonlyMap<string, PlanningIntentValue>;
  trackingStatusByShow: ReadonlyMap<number, ShowTrackingStatusValue>;
  hasCommentForMedia: ReadonlySet<string>;
};

export async function getExistingUserState(): Promise<ExistingUserState> {
  const { user } = await requireSession();

  const [movies, episodes, planning, tracking, comments] = await Promise.all([
    db
      .select({
        movieProviderId: movieWatchEvents.movieProviderId,
        watchedAt: movieWatchEvents.watchedAt,
      })
      .from(movieWatchEvents)
      .where(eq(movieWatchEvents.userId, user.id)),
    db
      .select({
        showProviderId: episodeWatchEvents.showProviderId,
        seasonNumber: episodeWatchEvents.seasonNumber,
        episodeNumber: episodeWatchEvents.episodeNumber,
        watchedAt: episodeWatchEvents.watchedAt,
      })
      .from(episodeWatchEvents)
      .where(eq(episodeWatchEvents.userId, user.id)),
    db
      .select({
        mediaType: mediaPlanningItems.mediaType,
        mediaProviderId: mediaPlanningItems.mediaProviderId,
        intent: mediaPlanningItems.intent,
      })
      .from(mediaPlanningItems)
      .where(eq(mediaPlanningItems.userId, user.id)),
    db
      .select({
        showProviderId: showTrackingState.showProviderId,
        status: showTrackingState.status,
      })
      .from(showTrackingState)
      .where(eq(showTrackingState.userId, user.id)),
    db
      .select({
        mediaType: mediaComments.mediaType,
        mediaProviderId: mediaComments.mediaProviderId,
      })
      .from(mediaComments)
      .where(eq(mediaComments.userId, user.id)),
  ]);

  const movieWatchedAtByMovie = new Map<number, Date[]>();
  for (const row of movies) {
    const existing = movieWatchedAtByMovie.get(row.movieProviderId);
    if (existing) existing.push(row.watchedAt);
    else movieWatchedAtByMovie.set(row.movieProviderId, [row.watchedAt]);
  }

  const episodeWatchedAtByEpisode = new Map<string, Date[]>();
  for (const row of episodes) {
    const key = episodeKey(row.showProviderId, row.seasonNumber, row.episodeNumber);
    const existing = episodeWatchedAtByEpisode.get(key);
    if (existing) existing.push(row.watchedAt);
    else episodeWatchedAtByEpisode.set(key, [row.watchedAt]);
  }

  return {
    movieWatchedAtByMovie,
    episodeWatchedAtByEpisode,
    planningIntentByMedia: new Map(
      planning.map((row) => [mediaKey(row.mediaType, row.mediaProviderId), row.intent]),
    ),
    trackingStatusByShow: new Map(tracking.map((row) => [row.showProviderId, row.status])),
    hasCommentForMedia: new Set(
      comments.map((row) => mediaKey(row.mediaType, row.mediaProviderId)),
    ),
  };
}
