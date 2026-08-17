import "server-only";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { mediaComments } from "@/server/db/schema/opinions";
import type { MediaComment, OpinionMediaType } from "./types";
import { COMMENT_MAX_LENGTH } from "./types";

function toMediaComment(row: typeof mediaComments.$inferSelect): MediaComment {
  return {
    mediaType: row.mediaType,
    mediaProviderId: row.mediaProviderId,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function deleteComment(
  userId: string,
  mediaType: OpinionMediaType,
  mediaProviderId: number,
): Promise<void> {
  await db
    .delete(mediaComments)
    .where(
      and(
        eq(mediaComments.userId, userId),
        eq(mediaComments.mediaType, mediaType),
        eq(mediaComments.mediaProviderId, mediaProviderId),
      ),
    );
}

// Sets (creates or replaces) the user's comment — one row per user+media,
// upserted in place (see docs/opinions.md, "Comment ownership"). A
// whitespace-only comment deletes the row instead of persisting an empty
// one — never a documented, silent no-op, always a real removal (see
// docs/opinions.md, "Comment mutations").
//
// `importBatchId` is only ever passed by `server/import/`'s own
// persistence layer, which only ever calls this for media with no
// existing comment at all — private comments are never silently
// overwritten by import (see docs/data-portability.md, "Comments
// merge"). Every real call (the actual comment editor) omits it, which
// unconditionally clears any prior import attribution — the "later user
// modification" that must survive an import rollback.
export async function setMediaComment(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  content: string;
  importBatchId?: string;
}): Promise<MediaComment | null> {
  const trimmed = input.content.trim();
  const { user } = await requireSession();

  if (trimmed.length === 0) {
    await deleteComment(user.id, input.mediaType, input.mediaProviderId);
    return null;
  }
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    throw new Error(`Comment must be ${COMMENT_MAX_LENGTH} characters or fewer`);
  }

  const [row] = await db
    .insert(mediaComments)
    .values({
      userId: user.id,
      mediaType: input.mediaType,
      mediaProviderId: input.mediaProviderId,
      content: trimmed,
      importBatchId: input.importBatchId ?? null,
    })
    .onConflictDoUpdate({
      target: [mediaComments.userId, mediaComments.mediaType, mediaComments.mediaProviderId],
      set: {
        content: trimmed,
        updatedAt: /* @__PURE__ */ new Date(),
        importBatchId: input.importBatchId ?? null,
      },
    })
    .returning();

  if (!row) throw new Error("Failed to save comment");
  return toMediaComment(row);
}

// Removes the comment entirely — a compact, explicit delete action,
// distinct from saving empty text through `setMediaComment` (same
// effect, different entry point: one is "I cleared the field and
// saved," the other is "I hit delete").
export async function clearMediaComment(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
}): Promise<void> {
  const { user } = await requireSession();
  await deleteComment(user.id, input.mediaType, input.mediaProviderId);
}

export async function getMediaComment(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
}): Promise<MediaComment | null> {
  const { user } = await requireSession();

  const [row] = await db
    .select()
    .from(mediaComments)
    .where(
      and(
        eq(mediaComments.userId, user.id),
        eq(mediaComments.mediaType, input.mediaType),
        eq(mediaComments.mediaProviderId, input.mediaProviderId),
      ),
    );

  return row ? toMediaComment(row) : null;
}
