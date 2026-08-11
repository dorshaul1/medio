import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { episodeWatchEvents, showTrackingState } from "@/server/db/schema/tracking";
import { clearPlanningItem } from "@/server/planning/planning-items";
import type { ShowTrackingState } from "./types";

// Explicit Show Tracking State commands — `watching`/`on_hold`/`dropped`
// only. Never `caught_up`/`waiting`/`completed`; those are derived (see
// derived-state.ts) and have no command here because there is nothing to
// set — see docs/tracking.md.

function toShowTrackingState(row: typeof showTrackingState.$inferSelect): ShowTrackingState {
  return {
    showProviderId: row.showProviderId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Also clears any Watchlist/Backlog planning entry for this show, in the
// same transaction — see docs/library.md, "Planning clears when tracking
// starts". Any explicit tracking state (watching/on_hold/dropped) means
// the show is now tracked, which is mutually exclusive with still being
// planned — so this applies uniformly, not just for `watching`. A no-op
// if no planning entry exists.
//
// `importBatchId` is only ever passed by `server/import/`'s own
// persistence layer; every real call (`startWatchingShow`/`putShowOnHold`/
// `dropShow`, called by the actual tracking controls) omits it, which
// unconditionally clears any prior import attribution on this row —
// exactly the "later user modification" that must survive an import
// rollback (see docs/data-portability.md, "Rollback semantics").
async function upsertShowStatus(
  userId: string,
  showProviderId: number,
  status: ShowTrackingState["status"],
  importBatchId?: string,
): Promise<ShowTrackingState> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(showTrackingState)
      .values({ userId, showProviderId, status, importBatchId: importBatchId ?? null })
      .onConflictDoUpdate({
        target: [showTrackingState.userId, showTrackingState.showProviderId],
        set: {
          status,
          updatedAt: /* @__PURE__ */ new Date(),
          importBatchId: importBatchId ?? null,
        },
      })
      .returning();

    if (!row) throw new Error("Failed to update show tracking state");

    await clearPlanningItem(tx, userId, "show", showProviderId);

    return toShowTrackingState(row);
  });
}

// Explicitly starts (or resumes) tracking a show as `watching`, without
// fabricating any episode watch history — starting to track a show and
// watching an episode are different actions (see docs/tracking.md).
export async function startWatchingShow(
  showProviderId: number,
  importBatchId?: string,
): Promise<ShowTrackingState> {
  const { user } = await requireSession();
  return upsertShowStatus(user.id, showProviderId, "watching", importBatchId);
}

export async function putShowOnHold(
  showProviderId: number,
  importBatchId?: string,
): Promise<ShowTrackingState> {
  const { user } = await requireSession();
  return upsertShowStatus(user.id, showProviderId, "on_hold", importBatchId);
}

export async function dropShow(
  showProviderId: number,
  importBatchId?: string,
): Promise<ShowTrackingState> {
  const { user } = await requireSession();
  return upsertShowStatus(user.id, showProviderId, "dropped", importBatchId);
}

// Clears explicit tracking state entirely (back to no row at all — the
// "not started" UI representation is the absence of both an explicit
// state and watch history, never a persisted `not_started` value). This
// never touches episode watch history — history and explicit state are
// separate concepts.
export async function clearShowTrackingState(showProviderId: number): Promise<void> {
  const { user } = await requireSession();

  await db
    .delete(showTrackingState)
    .where(
      and(
        eq(showTrackingState.userId, user.id),
        eq(showTrackingState.showProviderId, showProviderId),
      ),
    );
}

// The user's current explicit state for a show, or `null` if none exists
// (no row — not a "not_started" enum value).
export async function getShowTrackingState(
  showProviderId: number,
): Promise<ShowTrackingState | null> {
  const { user } = await requireSession();

  const [row] = await db
    .select()
    .from(showTrackingState)
    .where(
      and(
        eq(showTrackingState.userId, user.id),
        eq(showTrackingState.showProviderId, showProviderId),
      ),
    )
    .limit(1);

  return row ? toShowTrackingState(row) : null;
}

// Every show this user is currently explicitly "watching", most recently
// active first — the bulk read personalized Home's candidate-first
// composition needs (see docs/home.md) instead of fetching per show.
// `updatedAt` is bumped on every explicit state change *and* on every
// recorded episode watch (see `episode-events.ts`), so this ordering
// already reflects genuine recent viewing activity, including rewatches
// of older episodes. `limit` bounds how many candidates get the
// (comparatively expensive) provider hydration a caller like Home does
// next — never unbounded.
export async function listWatchingShows(limit: number): Promise<readonly ShowTrackingState[]> {
  const { user } = await requireSession();

  const rows = await db
    .select()
    .from(showTrackingState)
    .where(and(eq(showTrackingState.userId, user.id), eq(showTrackingState.status, "watching")))
    .orderBy(desc(showTrackingState.updatedAt))
    .limit(limit);

  return rows.map(toShowTrackingState);
}

// Batched explicit tracking status for a specific, already-known set of
// shows — one query, never per item. For a caller (Search results,
// Discover cards) that only needs the *explicit* watching/on_hold/dropped
// state, not the full derived caught_up/waiting/completed classification
// (that requires per-show provider hydration — see
// docs/library.md, "Show derived state at Library scale" — deliberately
// out of reach for an N-result public browsing surface). See
// server/media/personal-state.ts.
export async function getShowTrackingStatusesBatch(
  showProviderIds: readonly number[],
): Promise<ReadonlyMap<number, ShowTrackingState["status"]>> {
  if (showProviderIds.length === 0) return new Map();
  const { user } = await requireSession();

  const rows = await db
    .select({ showProviderId: showTrackingState.showProviderId, status: showTrackingState.status })
    .from(showTrackingState)
    .where(
      and(
        eq(showTrackingState.userId, user.id),
        inArray(showTrackingState.showProviderId, [...showProviderIds]),
      ),
    );

  return new Map(rows.map((row) => [row.showProviderId, row.status]));
}

// Batch "does this user already have any relationship with this show" —
// for a bounded set of candidate show ids, which ones already have
// either an explicit tracking state (watching/on_hold/dropped) or any
// watched episode. Powers Pick's discovery-candidate exclusion (see
// docs/recommendations.md, "Discovery candidate exclusion") — a show the
// user already knows about should never be presented as a fresh
// discovery, one query per source table, never one per candidate.
export async function getKnownShowIds(
  showProviderIds: readonly number[],
): Promise<ReadonlySet<number>> {
  if (showProviderIds.length === 0) return new Set();
  const { user } = await requireSession();

  const [trackedRows, watchedRows] = await Promise.all([
    db
      .selectDistinct({ showProviderId: showTrackingState.showProviderId })
      .from(showTrackingState)
      .where(
        and(
          eq(showTrackingState.userId, user.id),
          inArray(showTrackingState.showProviderId, [...showProviderIds]),
        ),
      ),
    db
      .selectDistinct({ showProviderId: episodeWatchEvents.showProviderId })
      .from(episodeWatchEvents)
      .where(
        and(
          eq(episodeWatchEvents.userId, user.id),
          inArray(episodeWatchEvents.showProviderId, [...showProviderIds]),
        ),
      ),
  ]);

  return new Set([
    ...trackedRows.map((row) => row.showProviderId),
    ...watchedRows.map((row) => row.showProviderId),
  ]);
}
