import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db, type Transaction } from "@/server/db";
import { mediaPlanningItems } from "@/server/db/schema/planning";
import type { MediaType } from "@/server/media/types";
import type { PlanningIntent, PlanningItem } from "./types";

// Every function here (except `clearPlanningItem`, a cross-domain
// integration point — see below) derives the acting user from the
// authenticated session itself — never from a caller-supplied argument.
// See docs/library.md, "Ownership and privacy".

function toPlanningItem(row: typeof mediaPlanningItems.$inferSelect): PlanningItem {
  return {
    mediaType: row.mediaType,
    mediaProviderId: row.mediaProviderId,
    intent: row.intent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// `importBatchId` is only ever passed by `server/import/`'s own
// persistence layer, which only ever calls this for media with no
// existing planning entry at all (imports never override an existing
// Watchlist/Backlog choice — see docs/data-portability.md, "Planning
// merge"). Every real call (`addToWatchlist`/`addToBacklog`/
// `changePlanningIntent`, i.e. the actual Save/"Move to..." controls)
// omits it, which unconditionally clears any prior import attribution —
// the "later user modification" that must survive an import rollback.
async function upsertPlanningIntent(
  userId: string,
  mediaType: MediaType,
  mediaProviderId: number,
  intent: PlanningIntent,
  importBatchId?: string,
): Promise<PlanningItem> {
  const [row] = await db
    .insert(mediaPlanningItems)
    .values({ userId, mediaType, mediaProviderId, intent, importBatchId: importBatchId ?? null })
    .onConflictDoUpdate({
      target: [
        mediaPlanningItems.userId,
        mediaPlanningItems.mediaType,
        mediaPlanningItems.mediaProviderId,
      ],
      set: { intent, updatedAt: /* @__PURE__ */ new Date(), importBatchId: importBatchId ?? null },
    })
    .returning();

  if (!row) throw new Error("Failed to save planning intent");
  return toPlanningItem(row);
}

// Saves media as lightweight, saved-for-later interest. If the media
// already has a planning entry (either intent), this updates that same
// row in place — never a second, contradictory row (see the unique
// composite primary key in `schema/planning.ts`).
export async function addToWatchlist(
  mediaType: MediaType,
  mediaProviderId: number,
  importBatchId?: string,
): Promise<PlanningItem> {
  const { user } = await requireSession();
  return upsertPlanningIntent(user.id, mediaType, mediaProviderId, "watchlist", importBatchId);
}

// Saves media as a stronger, active intent to watch. Same upsert
// semantics as `addToWatchlist`.
export async function addToBacklog(
  mediaType: MediaType,
  mediaProviderId: number,
  importBatchId?: string,
): Promise<PlanningItem> {
  const { user } = await requireSession();
  return upsertPlanningIntent(user.id, mediaType, mediaProviderId, "backlog", importBatchId);
}

// Switches an existing planning entry between Watchlist and Backlog —
// the Library/planning-control "move to..." action. Also creates the
// entry if none exists yet, so callers don't need a separate branch for
// "first save" vs. "change intent".
export async function changePlanningIntent(
  mediaType: MediaType,
  mediaProviderId: number,
  intent: PlanningIntent,
): Promise<PlanningItem> {
  const { user } = await requireSession();
  return upsertPlanningIntent(user.id, mediaType, mediaProviderId, intent);
}

// Removes a planning entry outright (the Library/planning-control
// "remove" action). Never touches watch history or tracking state —
// planning and tracking are separate concepts; see docs/library.md.
export async function removePlanningItem(
  mediaType: MediaType,
  mediaProviderId: number,
): Promise<void> {
  const { user } = await requireSession();

  await db
    .delete(mediaPlanningItems)
    .where(
      and(
        eq(mediaPlanningItems.userId, user.id),
        eq(mediaPlanningItems.mediaType, mediaType),
        eq(mediaPlanningItems.mediaProviderId, mediaProviderId),
      ),
    );
}

// The current planning entry for one piece of media, or `null` if none
// exists — what Movie/Show Details' planning control reads to render its
// current state.
export async function getPlanningState(
  mediaType: MediaType,
  mediaProviderId: number,
): Promise<PlanningItem | null> {
  const { user } = await requireSession();

  const [row] = await db
    .select()
    .from(mediaPlanningItems)
    .where(
      and(
        eq(mediaPlanningItems.userId, user.id),
        eq(mediaPlanningItems.mediaType, mediaType),
        eq(mediaPlanningItems.mediaProviderId, mediaProviderId),
      ),
    )
    .limit(1);

  return row ? toPlanningItem(row) : null;
}

// Every saved item (Watchlist + Backlog, both media types), most
// recently changed first — the bounded read Pick's "Saved" candidate
// pool needs (see docs/recommendations.md) instead of loading the whole
// Library page's composed read model just to see what's saved. `limit`
// caps how many candidates go on to (comparatively expensive) provider
// hydration — never unbounded.
export async function listPlanningItems(limit: number): Promise<readonly PlanningItem[]> {
  const { user } = await requireSession();

  const rows = await db
    .select()
    .from(mediaPlanningItems)
    .where(eq(mediaPlanningItems.userId, user.id))
    .orderBy(desc(mediaPlanningItems.updatedAt))
    .limit(limit);

  return rows.map(toPlanningItem);
}

// The one integration point between Planning and Tracking (see
// docs/tracking.md, "Planning clears when tracking starts"): removes a
// planning entry as a side effect of the user actually starting to
// consume that media. Takes an explicit transaction and user id — always
// called from inside a Tracking command's own transaction (recording a
// first watch, starting a show), never on its own — so the planning
// removal commits atomically with the tracking write, and a failed
// tracking write can never silently strand a cleared planning entry, or
// vice versa. No-op if no planning entry exists.
export async function clearPlanningItem(
  tx: Transaction,
  userId: string,
  mediaType: MediaType,
  mediaProviderId: number,
): Promise<void> {
  await tx
    .delete(mediaPlanningItems)
    .where(
      and(
        eq(mediaPlanningItems.userId, userId),
        eq(mediaPlanningItems.mediaType, mediaType),
        eq(mediaPlanningItems.mediaProviderId, mediaProviderId),
      ),
    );
}
