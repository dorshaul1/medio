import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import type { ImportBatchStatusValue, ImportSourceValue } from "@/server/db/schema/import";
import { importBatches } from "@/server/db/schema/import";
import { mediaNotes, mediaRatings } from "@/server/db/schema/opinions";
import { mediaPlanningItems } from "@/server/db/schema/planning";
import {
  episodeWatchEvents,
  movieWatchEvents,
  showTrackingState,
} from "@/server/db/schema/tracking";
import type { ImportRecordKind } from "./types";

export type ImportBatchSummary = {
  id: string;
  source: ImportSourceValue;
  sourceFilename: string | null;
  importedAt: Date;
  status: ImportBatchStatusValue;
  counts: Record<string, number>;
};

function toBatchSummary(row: typeof importBatches.$inferSelect): ImportBatchSummary {
  return {
    id: row.id,
    source: row.source,
    sourceFilename: row.sourceFilename,
    importedAt: row.importedAt,
    status: row.status,
    counts: row.counts as Record<string, number>,
  };
}

// Settings → Data's "recent imports" list — see docs/data-portability.md,
// "Import batches". Bounded and recency-ordered, same convention every
// other "recent X" read in this app already uses.
export async function listImportBatches(limit = 20): Promise<readonly ImportBatchSummary[]> {
  const { user } = await requireSession();

  const rows = await db
    .select()
    .from(importBatches)
    .where(eq(importBatches.userId, user.id))
    .orderBy(desc(importBatches.importedAt))
    .limit(limit);

  return rows.map(toBatchSummary);
}

export type RollbackResult = {
  removed: Record<ImportRecordKind, number>;
};

function emptyCounts(): Record<ImportRecordKind, number> {
  return {
    movieWatch: 0,
    episodeWatch: 0,
    planningItem: 0,
    showTrackingState: 0,
    rating: 0,
    note: 0,
  };
}

// "Undo import" — see docs/data-portability.md, "Rollback semantics".
// Deliberately conservative: every delete is scoped to
// `import_batch_id = batchId` on rows that also still belong to this
// user, never "every row that happens to match this media" — a real
// user edit/mutation made after the import already cleared its
// `import_batch_id` (see the ownership-transfer comments on
// `recordMovieWatch`/`upsertPlanningIntent`/etc.), so it's structurally
// impossible for this to remove a later, independent user choice. Never
// deletes the `import_batches` row itself — it's marked `rolled_back`
// and stays as a permanent audit record. Idempotent: rolling back an
// already-rolled-back batch is a safe no-op, never an error.
export async function rollbackImportBatch(batchId: string): Promise<RollbackResult> {
  const { user } = await requireSession();

  const [batch] = await db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, user.id)));
  if (!batch) throw new Error("Import batch not found");
  if (batch.status === "rolled_back") return { removed: emptyCounts() };

  return db.transaction(async (tx) => {
    // Sequential, not `Promise.all` — a transaction is bound to one
    // connection, and node-postgres doesn't support concurrent queries
    // on the same client (issuing them concurrently here triggered a
    // real "client is already executing a query" deprecation warning
    // during testing, not just a style preference).
    const movies = await tx
      .delete(movieWatchEvents)
      .where(and(eq(movieWatchEvents.importBatchId, batchId), eq(movieWatchEvents.userId, user.id)))
      .returning({ id: movieWatchEvents.id });
    const episodes = await tx
      .delete(episodeWatchEvents)
      .where(
        and(eq(episodeWatchEvents.importBatchId, batchId), eq(episodeWatchEvents.userId, user.id)),
      )
      .returning({ id: episodeWatchEvents.id });
    const planning = await tx
      .delete(mediaPlanningItems)
      .where(
        and(eq(mediaPlanningItems.importBatchId, batchId), eq(mediaPlanningItems.userId, user.id)),
      )
      .returning({ userId: mediaPlanningItems.userId });
    const tracking = await tx
      .delete(showTrackingState)
      .where(
        and(eq(showTrackingState.importBatchId, batchId), eq(showTrackingState.userId, user.id)),
      )
      .returning({ userId: showTrackingState.userId });
    const ratings = await tx
      .delete(mediaRatings)
      .where(and(eq(mediaRatings.importBatchId, batchId), eq(mediaRatings.userId, user.id)))
      .returning({ userId: mediaRatings.userId });
    const notes = await tx
      .delete(mediaNotes)
      .where(and(eq(mediaNotes.importBatchId, batchId), eq(mediaNotes.userId, user.id)))
      .returning({ userId: mediaNotes.userId });

    await tx
      .update(importBatches)
      .set({ status: "rolled_back" })
      .where(eq(importBatches.id, batchId));

    return {
      removed: {
        movieWatch: movies.length,
        episodeWatch: episodes.length,
        planningItem: planning.length,
        showTrackingState: tracking.length,
        rating: ratings.length,
        note: notes.length,
      },
    };
  });
}
