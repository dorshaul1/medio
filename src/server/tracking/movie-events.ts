import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { movieWatchEvents } from "@/server/db/schema/tracking";
import { clearPlanningItem } from "@/server/planning/planning-items";
import type { MovieWatchEvent, MovieWatchSummary } from "./types";

// Every function here derives the acting user from the authenticated
// session itself — never from a caller-supplied argument. See
// docs/tracking.md, "Ownership and privacy".

function toMovieWatchEvent(row: typeof movieWatchEvents.$inferSelect): MovieWatchEvent {
  return {
    id: row.id,
    movieProviderId: row.movieProviderId,
    watchedAt: row.watchedAt,
    createdAt: row.createdAt,
  };
}

// Records one viewing of a movie. Rewatching creates another row — never
// overwrites or upserts an existing one; see docs/tracking.md,
// "Rewatch semantics". `watchedAt` defaults to now but callers may
// backdate a corrected/historical entry.
//
// Also clears any Watchlist/Backlog planning entry for this movie, in the
// same transaction — see docs/library.md, "Planning clears when tracking
// starts". A no-op if no planning entry exists.
//
// `importBatchId` is only ever passed by `server/import/`'s own
// persistence layer — every real product call site (Movie Details'
// tracking control, Diary, etc.) omits it, which is what attributes the
// row to no batch at all. See docs/data-portability.md, "Rollback
// semantics".
export async function recordMovieWatch(input: {
  movieProviderId: number;
  watchedAt?: Date;
  importBatchId?: string;
}): Promise<MovieWatchEvent> {
  const { user } = await requireSession();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(movieWatchEvents)
      .values({
        userId: user.id,
        movieProviderId: input.movieProviderId,
        importBatchId: input.importBatchId ?? null,
        ...(input.watchedAt ? { watchedAt: input.watchedAt } : {}),
      })
      .returning();

    if (!row) throw new Error("Failed to record movie watch");

    await clearPlanningItem(tx, user.id, "movie", input.movieProviderId);

    return toMovieWatchEvent(row);
  });
}

// Corrects exactly one event's `watchedAt` — the Diary's "Edit watch
// date" action (see docs/diary.md). The ownership check lives in the
// query itself, same guarantee as `removeMovieWatchEvent`; there is no
// way to pass a different `movieProviderId` through this function, so an
// edit can never turn one movie's viewing into another movie's — only
// *when* it happened is editable, never *what* was watched.
//
// Always clears `importBatchId` — a real user edit is exactly the
// "later user modification" that must survive an import rollback (see
// docs/data-portability.md, "Rollback semantics"); this function is
// never called by the import layer itself.
export async function updateMovieWatchedAt(
  eventId: string,
  watchedAt: Date,
): Promise<MovieWatchEvent | null> {
  const { user } = await requireSession();

  const [row] = await db
    .update(movieWatchEvents)
    .set({ watchedAt, importBatchId: null })
    .where(and(eq(movieWatchEvents.id, eventId), eq(movieWatchEvents.userId, user.id)))
    .returning();

  return row ? toMovieWatchEvent(row) : null;
}

// Removes exactly the one event identified by `eventId` — never "every
// event for this movie". The ownership check lives in the query itself
// (`and(eq(id), eq(userId))`), not as a separate lookup-then-trust step,
// so a user can never delete another user's row by guessing/reusing an
// ID. Silently no-ops if the event doesn't exist or isn't this user's —
// callers that need to know which happened can check the returned row.
export async function removeMovieWatchEvent(eventId: string): Promise<MovieWatchEvent | null> {
  const { user } = await requireSession();

  const [row] = await db
    .delete(movieWatchEvents)
    .where(and(eq(movieWatchEvents.id, eventId), eq(movieWatchEvents.userId, user.id)))
    .returning();

  return row ? toMovieWatchEvent(row) : null;
}

// Full history for one movie, most recent first — for a compact history
// popover (see docs/tracking.md), never a general Watch Diary.
export async function listMovieWatchEvents(
  movieProviderId: number,
): Promise<readonly MovieWatchEvent[]> {
  const { user } = await requireSession();

  const rows = await db
    .select()
    .from(movieWatchEvents)
    .where(
      and(
        eq(movieWatchEvents.userId, user.id),
        eq(movieWatchEvents.movieProviderId, movieProviderId),
      ),
    )
    .orderBy(desc(movieWatchEvents.watchedAt));

  return rows.map(toMovieWatchEvent);
}

// A summary, not the full event history — for Movie Details' primary
// tracking display, which never needs every rewatch date to render
// "Watched 3 times".
export async function getMovieWatchSummary(movieProviderId: number): Promise<MovieWatchSummary> {
  const events = await listMovieWatchEvents(movieProviderId);

  return {
    hasWatched: events.length > 0,
    watchCount: events.length,
    lastWatchedAt: events[0]?.watchedAt ?? null,
  };
}

// Batch "has this user watched it at all" for a bounded set of movies
// already being rendered (a public browse row's own items) — one query,
// never one per poster. Powers a quiet watched indicator on public media
// previews (see `features/media/media-poster.tsx`); a show's equivalent
// isn't included here, since "the entire show is watched" needs exact
// aired-episode knowledge this query has no way to know without a
// provider fetch per show (see docs/media-provider.md — that's exactly
// the per-item provider fetch this candidate-first architecture avoids
// on public browsing rows).
export async function getWatchedMovieIds(
  movieProviderIds: readonly number[],
): Promise<ReadonlySet<number>> {
  if (movieProviderIds.length === 0) return new Set();
  const { user } = await requireSession();

  const rows = await db
    .selectDistinct({ movieProviderId: movieWatchEvents.movieProviderId })
    .from(movieWatchEvents)
    .where(
      and(
        eq(movieWatchEvents.userId, user.id),
        inArray(movieWatchEvents.movieProviderId, [...movieProviderIds]),
      ),
    );

  return new Set(rows.map((row) => row.movieProviderId));
}
