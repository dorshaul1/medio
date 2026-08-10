import "server-only";
import { eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { importBatches } from "@/server/db/schema/import";
import { setMediaNote } from "@/server/opinions/notes";
import { setMediaRating } from "@/server/opinions/ratings";
import { addToBacklog, addToWatchlist } from "@/server/planning/planning-items";
import { getSeasonDetails } from "@/server/tmdb/queries";
import { recordEpisodeWatch } from "@/server/tracking/episode-events";
import { recordMovieWatch } from "@/server/tracking/movie-events";
import { dropShow, putShowOnHold, startWatchingShow } from "@/server/tracking/show-state";
import type { ImportPlan, ImportRecordKind, ImportSource, PlanEntry } from "./types";
import { IMPORT_MODEL_VERSION } from "./types";

export type PersistResult = {
  batchId: string;
  created: Record<ImportRecordKind, number>;
  // A "ready" entry that still failed at write time (e.g. a transient DB
  // error, or an episode that no longer exists in a season's current
  // listing) — reported honestly, never silently folded into "created"
  // (see docs/data-portability.md, "Import transactions").
  failed: readonly { kind: ImportRecordKind; reason: string }[];
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

// Writes every "ready" entry in an already-confirmed plan — the one
// place `server/import/` actually mutates the database (see
// docs/data-portability.md, "Import Plan": only `ready` ever executes
// automatically). Every write reuses the exact same domain mutation
// function a real product action would call (`recordMovieWatch`,
// `addToWatchlist`, ...), passing this batch's id through for
// provenance/rollback — see CLAUDE.md, "Imported and native watch
// events share the same core semantics after validation". A per-record
// failure never aborts the rest of the batch; it's reported in `failed`
// instead, and the batch row itself always reflects what actually
// happened, never what was merely planned.
export async function persistImportPlan(input: {
  plan: ImportPlan;
  source: ImportSource;
  sourceFilename: string | null;
}): Promise<PersistResult> {
  const { user } = await requireSession();
  const readyEntries = input.plan.entries.filter((entry) => entry.status === "ready");

  const [batchRow] = await db
    .insert(importBatches)
    .values({
      userId: user.id,
      source: input.source,
      sourceFilename: input.sourceFilename,
      importVersion: IMPORT_MODEL_VERSION,
      counts: input.plan.summary.readyByKind,
    })
    .returning();
  if (!batchRow) throw new Error("Failed to create import batch");

  const created = emptyCounts();
  const failed: { kind: ImportRecordKind; reason: string }[] = [];

  for (const entry of readyEntries) {
    try {
      await persistOne(entry, batchRow.id);
      created[entry.record.kind]++;
    } catch (error) {
      failed.push({
        kind: entry.record.kind,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Reflects what was actually created, not what was merely planned —
  // a partial failure must never be reported as a full success (see
  // docs/data-portability.md, "Import transactions").
  await db.update(importBatches).set({ counts: created }).where(eq(importBatches.id, batchRow.id));

  return { batchId: batchRow.id, created, failed };
}

async function persistOne(entry: PlanEntry, batchId: string): Promise<void> {
  const { resolved, record } = entry;
  if (resolved.status !== "resolved") {
    throw new Error("Cannot persist an entry whose media identity was never resolved");
  }
  const providerId = resolved.providerId;

  switch (record.kind) {
    case "movieWatch":
      await recordMovieWatch({
        movieProviderId: providerId,
        watchedAt: record.watchedAt,
        importBatchId: batchId,
      });
      return;

    case "episodeWatch": {
      const episodeProviderId =
        record.episodeProviderId ??
        (await resolveEpisodeProviderId(providerId, record.seasonNumber, record.episodeNumber));
      await recordEpisodeWatch({
        showProviderId: providerId,
        seasonNumber: record.seasonNumber,
        episodeNumber: record.episodeNumber,
        episodeProviderId,
        watchedAt: record.watchedAt,
        importBatchId: batchId,
      });
      return;
    }

    case "planningItem":
      if (record.intent === "watchlist") {
        await addToWatchlist(resolved.mediaType, providerId, batchId);
      } else {
        await addToBacklog(resolved.mediaType, providerId, batchId);
      }
      return;

    case "showTrackingState":
      if (record.status === "watching") await startWatchingShow(providerId, batchId);
      else if (record.status === "on_hold") await putShowOnHold(providerId, batchId);
      else await dropShow(providerId, batchId);
      return;

    case "rating":
      await setMediaRating({
        mediaType: resolved.mediaType,
        mediaProviderId: providerId,
        rating: record.rating,
        importBatchId: batchId,
      });
      return;

    case "note":
      await setMediaNote({
        mediaType: resolved.mediaType,
        mediaProviderId: providerId,
        content: record.content,
        importBatchId: batchId,
      });
      return;
  }
}

// Only ever needed for a source that couldn't supply a real episode
// provider id itself (generic CSV — see docs/data-portability.md,
// "Generic CSV"). Native imports already carry the real id; Letterboxd
// doesn't support episode-level import at all in this phase. A missing
// episode (season renumbered/removed upstream since the source was
// created) is a real, reportable failure — never silently skipped.
async function resolveEpisodeProviderId(
  showProviderId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<number> {
  const season = await getSeasonDetails(showProviderId, seasonNumber);
  const episode = season.episodes.find((candidate) => candidate.episodeNumber === episodeNumber);
  if (!episode) {
    throw new Error(
      `Season ${seasonNumber} Episode ${episodeNumber} could not be found for this show.`,
    );
  }
  return episode.id;
}
