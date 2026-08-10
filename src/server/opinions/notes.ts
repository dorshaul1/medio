import "server-only";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { mediaNotes } from "@/server/db/schema/opinions";
import type { MediaNote, OpinionMediaType } from "./types";
import { NOTE_MAX_LENGTH } from "./types";

function toMediaNote(row: typeof mediaNotes.$inferSelect): MediaNote {
  return {
    mediaType: row.mediaType,
    mediaProviderId: row.mediaProviderId,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function deleteNote(
  userId: string,
  mediaType: OpinionMediaType,
  mediaProviderId: number,
): Promise<void> {
  await db
    .delete(mediaNotes)
    .where(
      and(
        eq(mediaNotes.userId, userId),
        eq(mediaNotes.mediaType, mediaType),
        eq(mediaNotes.mediaProviderId, mediaProviderId),
      ),
    );
}

// Sets (creates or replaces) the user's note — one row per user+media,
// upserted in place (see docs/opinions.md, "Notes ownership"). A
// whitespace-only note deletes the row instead of persisting an empty
// one — never a documented, silent no-op, always a real removal (see
// docs/opinions.md, "Note mutations").
//
// `importBatchId` is only ever passed by `server/import/`'s own
// persistence layer, which only ever calls this for media with no
// existing note at all — private notes are never silently overwritten
// by import (see docs/data-portability.md, "Notes merge"). Every real
// call (the actual note editor) omits it, which unconditionally clears
// any prior import attribution — the "later user modification" that
// must survive an import rollback.
export async function setMediaNote(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  content: string;
  importBatchId?: string;
}): Promise<MediaNote | null> {
  const trimmed = input.content.trim();
  const { user } = await requireSession();

  if (trimmed.length === 0) {
    await deleteNote(user.id, input.mediaType, input.mediaProviderId);
    return null;
  }
  if (trimmed.length > NOTE_MAX_LENGTH) {
    throw new Error(`Note must be ${NOTE_MAX_LENGTH} characters or fewer`);
  }

  const [row] = await db
    .insert(mediaNotes)
    .values({
      userId: user.id,
      mediaType: input.mediaType,
      mediaProviderId: input.mediaProviderId,
      content: trimmed,
      importBatchId: input.importBatchId ?? null,
    })
    .onConflictDoUpdate({
      target: [mediaNotes.userId, mediaNotes.mediaType, mediaNotes.mediaProviderId],
      set: {
        content: trimmed,
        updatedAt: /* @__PURE__ */ new Date(),
        importBatchId: input.importBatchId ?? null,
      },
    })
    .returning();

  if (!row) throw new Error("Failed to save note");
  return toMediaNote(row);
}

// Removes the note entirely — a compact, explicit delete action,
// distinct from saving empty text through `setMediaNote` (same effect,
// different entry point: one is "I cleared the field and saved," the
// other is "I hit delete").
export async function clearMediaNote(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
}): Promise<void> {
  const { user } = await requireSession();
  await deleteNote(user.id, input.mediaType, input.mediaProviderId);
}

export async function getMediaNote(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
}): Promise<MediaNote | null> {
  const { user } = await requireSession();

  const [row] = await db
    .select()
    .from(mediaNotes)
    .where(
      and(
        eq(mediaNotes.userId, user.id),
        eq(mediaNotes.mediaType, input.mediaType),
        eq(mediaNotes.mediaProviderId, input.mediaProviderId),
      ),
    );

  return row ? toMediaNote(row) : null;
}
