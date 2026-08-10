import "server-only";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { mediaRatings } from "@/server/db/schema/opinions";
import type { MediaRating, OpinionMediaType } from "./types";
import { RATING_MAX, RATING_MIN } from "./types";

// Every function here derives the acting user from the authenticated
// session itself — never from a caller-supplied argument. See
// docs/opinions.md, "Ownership and privacy".

function toMediaRating(row: typeof mediaRatings.$inferSelect): MediaRating {
  return {
    mediaType: row.mediaType,
    mediaProviderId: row.mediaProviderId,
    rating: row.rating,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Sets the user's current rating for one title — one row per
// user+media, upserted in place, never a new row per call (see
// docs/opinions.md, "Rating ownership"). Rewatching a movie/show, or
// correcting/deleting its watch history, never touches this: the rating
// is title-level opinion, completely independent of the event-level
// tracking domain (see docs/tracking.md).
//
// `importBatchId` is only ever passed by `server/import/`'s own
// persistence layer, which only ever calls this for media with no
// existing rating at all — imports never overwrite an existing rating
// (see docs/data-portability.md, "Ratings merge"). Every real call (the
// actual rating control) omits it, which unconditionally clears any
// prior import attribution — the "later user modification" that must
// survive an import rollback.
export async function setMediaRating(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  rating: number;
  importBatchId?: string;
}): Promise<MediaRating> {
  if (!Number.isInteger(input.rating) || input.rating < RATING_MIN || input.rating > RATING_MAX) {
    throw new Error(`Rating must be an integer between ${RATING_MIN} and ${RATING_MAX}`);
  }
  const { user } = await requireSession();

  const [row] = await db
    .insert(mediaRatings)
    .values({
      userId: user.id,
      mediaType: input.mediaType,
      mediaProviderId: input.mediaProviderId,
      rating: input.rating,
      importBatchId: input.importBatchId ?? null,
    })
    .onConflictDoUpdate({
      target: [mediaRatings.userId, mediaRatings.mediaType, mediaRatings.mediaProviderId],
      set: {
        rating: input.rating,
        updatedAt: /* @__PURE__ */ new Date(),
        importBatchId: input.importBatchId ?? null,
      },
    })
    .returning();

  if (!row) throw new Error("Failed to set rating");
  return toMediaRating(row);
}

// Clears the user's rating entirely — a compact, secondary action (see
// docs/opinions.md, "Rating removal"), not an edit-mode/clear-field/
// submit flow. A no-op if no rating exists.
export async function clearMediaRating(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
}): Promise<void> {
  const { user } = await requireSession();

  await db
    .delete(mediaRatings)
    .where(
      and(
        eq(mediaRatings.userId, user.id),
        eq(mediaRatings.mediaType, input.mediaType),
        eq(mediaRatings.mediaProviderId, input.mediaProviderId),
      ),
    );
}

export async function getMediaRating(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
}): Promise<MediaRating | null> {
  const { user } = await requireSession();

  const [row] = await db
    .select()
    .from(mediaRatings)
    .where(
      and(
        eq(mediaRatings.userId, user.id),
        eq(mediaRatings.mediaType, input.mediaType),
        eq(mediaRatings.mediaProviderId, input.mediaProviderId),
      ),
    );

  return row ? toMediaRating(row) : null;
}

// Every current rating this user has ever set — one bounded query (a
// user's own rating count is inherently small relative to full watch
// history, since rating is a deliberate action). This is what Taste
// Profile's rating-based insights are built on (see docs/stats.md) —
// never a per-title lookup, and never derived by scanning watch history.
export async function listMediaRatings(): Promise<readonly MediaRating[]> {
  const { user } = await requireSession();

  const rows = await db.select().from(mediaRatings).where(eq(mediaRatings.userId, user.id));

  return rows.map(toMediaRating);
}
