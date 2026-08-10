import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { episodeWatchEvents, showTrackingState } from "@/server/db/schema/tracking";
import { clearPlanningItem } from "@/server/planning/planning-items";
import type { EpisodeWatchEvent, EpisodeWatchSummary } from "./types";

// Every function here derives the acting user from the authenticated
// session itself — never from a caller-supplied argument.

function toEpisodeWatchEvent(row: typeof episodeWatchEvents.$inferSelect): EpisodeWatchEvent {
  return {
    id: row.id,
    showProviderId: row.showProviderId,
    seasonNumber: row.seasonNumber,
    episodeNumber: row.episodeNumber,
    episodeProviderId: row.episodeProviderId,
    watchedAt: row.watchedAt,
    createdAt: row.createdAt,
  };
}

// Records one viewing of an episode, and — in the same transaction —
// ensures the show's explicit tracking state exists and is `watching`.
// See docs/tracking.md, "Automatic show state on episode watch": this
// unconditionally sets `watching`, including moving a show back from
// `on_hold`/`dropped`, on every recorded episode watch. Rewatching
// creates another row, same as movies — never an upsert. Also clears any
// Watchlist/Backlog planning entry for this show — see docs/library.md,
// "Planning clears when tracking starts".
//
// `importBatchId` is only ever passed by `server/import/`'s own
// persistence layer — every real product call site omits it, so this
// always clears it on the auto-set `watching` status too. That's
// correct, not just incidental: a real recorded episode watch is exactly
// the kind of independent "later user modification" that should detach
// the show's tracking state from an import batch, even if the state row
// itself started out import-created (see docs/data-portability.md,
// "Rollback semantics").
export async function recordEpisodeWatch(input: {
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  watchedAt?: Date;
  importBatchId?: string;
}): Promise<EpisodeWatchEvent> {
  const { user } = await requireSession();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(episodeWatchEvents)
      .values({
        userId: user.id,
        showProviderId: input.showProviderId,
        seasonNumber: input.seasonNumber,
        episodeNumber: input.episodeNumber,
        episodeProviderId: input.episodeProviderId,
        importBatchId: input.importBatchId ?? null,
        ...(input.watchedAt ? { watchedAt: input.watchedAt } : {}),
      })
      .returning();

    if (!row) throw new Error("Failed to record episode watch");

    await tx
      .insert(showTrackingState)
      .values({
        userId: user.id,
        showProviderId: input.showProviderId,
        status: "watching",
        importBatchId: input.importBatchId ?? null,
      })
      .onConflictDoUpdate({
        target: [showTrackingState.userId, showTrackingState.showProviderId],
        set: {
          status: "watching",
          updatedAt: /* @__PURE__ */ new Date(),
          importBatchId: input.importBatchId ?? null,
        },
      });

    await clearPlanningItem(tx, user.id, "show", input.showProviderId);

    return toEpisodeWatchEvent(row);
  });
}

// Corrects exactly one event's `watchedAt` — the Diary's "Edit watch
// date" action (see docs/diary.md). Same ownership guarantee as
// `removeEpisodeWatchEvent`, and same identity guarantee as
// `updateMovieWatchedAt`: there is no way to pass different show/season/
// episode coordinates through this function, so an edit can only move
// *when* an episode was watched, never turn it into a different episode.
// Deliberately does not touch `show_tracking_state`, same reasoning as
// every other per-event mutation in this file. Always clears
// `importBatchId` — same ownership-transfer-on-edit rule as
// `updateMovieWatchedAt` (see docs/data-portability.md).
export async function updateEpisodeWatchedAt(
  eventId: string,
  watchedAt: Date,
): Promise<EpisodeWatchEvent | null> {
  const { user } = await requireSession();

  const [row] = await db
    .update(episodeWatchEvents)
    .set({ watchedAt, importBatchId: null })
    .where(and(eq(episodeWatchEvents.id, eventId), eq(episodeWatchEvents.userId, user.id)))
    .returning();

  return row ? toEpisodeWatchEvent(row) : null;
}

// Removes exactly the one event identified by `eventId` — same ownership
// guarantee as removeMovieWatchEvent. Deliberately does not touch
// `show_tracking_state`: explicit status and watch history are separate
// concepts (see docs/tracking.md) — deleting the last watch event for a
// show must not silently clear "Watching".
export async function removeEpisodeWatchEvent(eventId: string): Promise<EpisodeWatchEvent | null> {
  const { user } = await requireSession();

  const [row] = await db
    .delete(episodeWatchEvents)
    .where(and(eq(episodeWatchEvents.id, eventId), eq(episodeWatchEvents.userId, user.id)))
    .returning();

  return row ? toEpisodeWatchEvent(row) : null;
}

// Unmarks one episode entirely — the toggle-off action `EpisodeWatchControl`
// calls. Unlike movies, episode tracking is a plain watched/unwatched
// toggle, not event-preserving history: clicking a watched episode again
// removes every watch event for it (there's normally only ever one, since
// the only way to create one is this same toggle), not just the most
// recent one. Deliberately does not touch `show_tracking_state` —
// unmarking one episode must not imply "stop watching the show".
export async function unmarkEpisodeWatched(episodeProviderId: number): Promise<void> {
  const { user } = await requireSession();

  await db
    .delete(episodeWatchEvents)
    .where(
      and(
        eq(episodeWatchEvents.userId, user.id),
        eq(episodeWatchEvents.episodeProviderId, episodeProviderId),
      ),
    );
}

// Deletes every episode watch event for one show — a full progress reset
// back to unwatched, the user-facing "Reset progress" action on Show
// Details (see docs/tracking.md). A deliberate, explicit bulk action, not
// something any single-episode control does implicitly. Leaves
// `show_tracking_state` untouched: resetting progress is not the same as
// stopping tracking — a user resetting a rewatch-from-the-start still
// wants the show to read as "Watching", just with 0 episodes watched.
export async function resetShowWatchHistory(showProviderId: number): Promise<void> {
  const { user } = await requireSession();

  await db
    .delete(episodeWatchEvents)
    .where(
      and(
        eq(episodeWatchEvents.userId, user.id),
        eq(episodeWatchEvents.showProviderId, showProviderId),
      ),
    );
}

// Marks every not-yet-watched episode in `episodes` watched, in one
// transaction — Season's own "Mark season watched" bulk action (see
// features/shows/season-watch-control.tsx). The caller passes only aired
// episodes (same aired-only rule as everywhere else in Tracking — see
// season page's `hasAired` filter); already-watched episodes are skipped
// rather than creating a duplicate/rewatch event, since this is "catch
// the rest of this season up," not a rewatch action. Sets the show's
// tracking state to `watching` exactly once, same automatic-state rule
// as a single episode watch, and is a no-op if there's nothing left to
// mark.
export async function markSeasonWatched(input: {
  showProviderId: number;
  seasonNumber: number;
  episodes: readonly { episodeNumber: number; episodeProviderId: number }[];
}): Promise<void> {
  const { user } = await requireSession();
  if (input.episodes.length === 0) return;

  await db.transaction(async (tx) => {
    const alreadyWatched = await tx
      .selectDistinct({ episodeNumber: episodeWatchEvents.episodeNumber })
      .from(episodeWatchEvents)
      .where(
        and(
          eq(episodeWatchEvents.userId, user.id),
          eq(episodeWatchEvents.showProviderId, input.showProviderId),
          eq(episodeWatchEvents.seasonNumber, input.seasonNumber),
        ),
      );
    const watchedNumbers = new Set(alreadyWatched.map((row) => row.episodeNumber));
    const toMark = input.episodes.filter((episode) => !watchedNumbers.has(episode.episodeNumber));
    if (toMark.length === 0) return;

    await tx.insert(episodeWatchEvents).values(
      toMark.map((episode) => ({
        userId: user.id,
        showProviderId: input.showProviderId,
        seasonNumber: input.seasonNumber,
        episodeNumber: episode.episodeNumber,
        episodeProviderId: episode.episodeProviderId,
      })),
    );

    await tx
      .insert(showTrackingState)
      .values({ userId: user.id, showProviderId: input.showProviderId, status: "watching" })
      .onConflictDoUpdate({
        target: [showTrackingState.userId, showTrackingState.showProviderId],
        set: { status: "watching", updatedAt: /* @__PURE__ */ new Date() },
      });

    await clearPlanningItem(tx, user.id, "show", input.showProviderId);
  });
}

// Marks every not-yet-watched episode across every *regular* season
// watched, in one transaction — Show Details' own whole-show "Mark all
// watched" bulk action (see features/shows/mark-show-watched-control.tsx),
// one level up from `markSeasonWatched`. The caller passes only aired
// episodes it already has on hand from the same per-season fetch that
// computed the show's progress (see
// features/shows/show-tracking-view.ts) — this never issues a fetch of
// its own. Specials (season 0) are deliberately never included here; a
// watched Special never factors into normal show completion (see
// docs/tracking.md), and has its own season page to mark separately.
// Already-watched episodes are skipped rather than creating a rewatch
// event, same "catch up the rest" semantics as `markSeasonWatched`.
export async function markShowWatched(input: {
  showProviderId: number;
  episodes: readonly { seasonNumber: number; episodeNumber: number; episodeProviderId: number }[];
}): Promise<void> {
  const { user } = await requireSession();
  if (input.episodes.length === 0) return;

  await db.transaction(async (tx) => {
    const alreadyWatched = await tx
      .selectDistinct({
        seasonNumber: episodeWatchEvents.seasonNumber,
        episodeNumber: episodeWatchEvents.episodeNumber,
      })
      .from(episodeWatchEvents)
      .where(
        and(
          eq(episodeWatchEvents.userId, user.id),
          eq(episodeWatchEvents.showProviderId, input.showProviderId),
        ),
      );
    const watchedKeys = new Set(
      alreadyWatched.map((row) => `${row.seasonNumber}:${row.episodeNumber}`),
    );
    const toMark = input.episodes.filter(
      (episode) => !watchedKeys.has(`${episode.seasonNumber}:${episode.episodeNumber}`),
    );
    if (toMark.length === 0) return;

    await tx.insert(episodeWatchEvents).values(
      toMark.map((episode) => ({
        userId: user.id,
        showProviderId: input.showProviderId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        episodeProviderId: episode.episodeProviderId,
      })),
    );

    await tx
      .insert(showTrackingState)
      .values({ userId: user.id, showProviderId: input.showProviderId, status: "watching" })
      .onConflictDoUpdate({
        target: [showTrackingState.userId, showTrackingState.showProviderId],
        set: { status: "watching", updatedAt: /* @__PURE__ */ new Date() },
      });

    await clearPlanningItem(tx, user.id, "show", input.showProviderId);
  });
}

// Unmarks every episode in one season — the toggle-back action for
// "Mark season watched" (see features/shows/season-watch-control.tsx),
// only ever reachable once the whole season is already watched. This
// deletes real watch history in bulk, same as `resetShowWatchHistory`
// (just scoped to one season instead of the whole show), so the caller
// requires a confirmation step first — see CLAUDE.md, "Tracking".
// Deliberately does not touch `show_tracking_state`, same rule as
// `unmarkEpisodeWatched`.
export async function unmarkSeasonWatched(input: {
  showProviderId: number;
  seasonNumber: number;
}): Promise<void> {
  const { user } = await requireSession();

  await db
    .delete(episodeWatchEvents)
    .where(
      and(
        eq(episodeWatchEvents.userId, user.id),
        eq(episodeWatchEvents.showProviderId, input.showProviderId),
        eq(episodeWatchEvents.seasonNumber, input.seasonNumber),
      ),
    );
}

// Every watch event for one show (optionally narrowed to one season) —
// the one bulk read a Season/Show page needs, instead of a query per
// episode. See docs/tracking.md, "Avoiding N+1 tracking reads".
export async function listEpisodeWatchEventsForShow(input: {
  showProviderId: number;
  seasonNumber?: number;
}): Promise<readonly EpisodeWatchEvent[]> {
  const { user } = await requireSession();

  const conditions = [
    eq(episodeWatchEvents.userId, user.id),
    eq(episodeWatchEvents.showProviderId, input.showProviderId),
  ];
  if (input.seasonNumber !== undefined) {
    conditions.push(eq(episodeWatchEvents.seasonNumber, input.seasonNumber));
  }

  const rows = await db
    .select()
    .from(episodeWatchEvents)
    .where(and(...conditions))
    .orderBy(desc(episodeWatchEvents.watchedAt));

  return rows.map(toEpisodeWatchEvent);
}

// A summary for one specific episode — for context where only one
// episode's state matters, not a whole season/show.
export async function getEpisodeWatchSummary(
  episodeProviderId: number,
): Promise<EpisodeWatchSummary> {
  const { user } = await requireSession();

  const rows = await db
    .select()
    .from(episodeWatchEvents)
    .where(
      and(
        eq(episodeWatchEvents.userId, user.id),
        eq(episodeWatchEvents.episodeProviderId, episodeProviderId),
      ),
    )
    .orderBy(desc(episodeWatchEvents.watchedAt));

  return {
    hasWatched: rows.length > 0,
    watchCount: rows.length,
    lastWatchedAt: rows[0]?.watchedAt ?? null,
  };
}

// Per-episode summaries for a whole season, keyed by episode number —
// built from the one bulk fetch above rather than one query per episode.
// Only watched episodes appear in the map; callers treat a missing entry
// as unwatched.
export async function getSeasonEpisodeWatchSummaries(input: {
  showProviderId: number;
  seasonNumber: number;
}): Promise<ReadonlyMap<number, EpisodeWatchSummary>> {
  const events = await listEpisodeWatchEventsForShow(input);

  const byEpisode = new Map<number, EpisodeWatchEvent[]>();
  for (const event of events) {
    const existing = byEpisode.get(event.episodeNumber);
    if (existing) {
      existing.push(event);
    } else {
      byEpisode.set(event.episodeNumber, [event]);
    }
  }

  const summaries = new Map<number, EpisodeWatchSummary>();
  for (const [episodeNumber, episodeEvents] of byEpisode) {
    const lastWatchedAt = episodeEvents.reduce(
      (latest, event) => (event.watchedAt > latest ? event.watchedAt : latest),
      episodeEvents[0]?.watchedAt ?? new Date(0),
    );
    summaries.set(episodeNumber, {
      hasWatched: true,
      watchCount: episodeEvents.length,
      lastWatchedAt,
    });
  }
  return summaries;
}
