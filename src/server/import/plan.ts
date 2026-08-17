// Pure import-plan construction — no I/O. Given already-resolved
// identities (see `matching.ts`) and a snapshot of the user's existing
// state (see `candidates.ts`), decides create/duplicate/conflict/
// unresolved for every record *before* anything is written — the "dry
// run" this domain is built around (see docs/data-portability.md,
// "Dry run" and "Import plan"). Same input always produces the same
// plan (see docs/data-portability.md, "Determinism") — no randomness,
// no fuzzy ordering.
import type { ExistingUserState } from "./candidates";
import { sameWatchDate } from "./date";
import type {
  ImportPlan,
  ImportRecordKind,
  ParsedImportRecord,
  PlanEntry,
  PlanSummary,
  ResolvedIdentity,
} from "./types";

export type ResolvedRecord = {
  record: ParsedImportRecord;
  resolved: ResolvedIdentity;
};

export function buildImportPlan(
  resolvedRecords: readonly ResolvedRecord[],
  existing: ExistingUserState,
): ImportPlan {
  // Mutable local copies, seeded from the real existing state — a later
  // record in this same pass can duplicate/conflict with an *earlier*
  // one already decided "ready" here, which is what catches a source
  // file's own accidental duplicate rows (or the same file uploaded
  // twice), not just duplicates against what was already in the
  // database before this import started.
  const movieWatchedAt = new Map<number, Date[]>(
    [...existing.movieWatchedAtByMovie].map(([id, dates]) => [id, [...dates]]),
  );
  const episodeWatchedAt = new Map<string, Date[]>(
    [...existing.episodeWatchedAtByEpisode].map(([key, dates]) => [key, [...dates]]),
  );
  const planningIntent = new Map(existing.planningIntentByMedia);
  const trackingStatus = new Map(existing.trackingStatusByShow);
  const hasComment = new Set(existing.hasCommentForMedia);

  const entries: PlanEntry[] = [];

  for (const { record, resolved } of resolvedRecords) {
    if (resolved.status !== "resolved") {
      entries.push({ record, resolved, status: resolved.status, reason: null });
      continue;
    }

    const providerId = resolved.providerId;

    switch (record.kind) {
      case "movieWatch": {
        const existingDates = movieWatchedAt.get(providerId) ?? [];
        const isDuplicate = existingDates.some((date) =>
          sameWatchDate(date, record.watchedAt, record.datePrecision),
        );
        if (isDuplicate) {
          entries.push({
            record,
            resolved,
            status: "duplicate",
            reason: "Already watched on this date.",
          });
        } else {
          movieWatchedAt.set(providerId, [...existingDates, record.watchedAt]);
          entries.push({ record, resolved, status: "ready", reason: null });
        }
        break;
      }
      case "episodeWatch": {
        const key = `${providerId}:${record.seasonNumber}:${record.episodeNumber}`;
        const existingDates = episodeWatchedAt.get(key) ?? [];
        const isDuplicate = existingDates.some((date) =>
          sameWatchDate(date, record.watchedAt, record.datePrecision),
        );
        if (isDuplicate) {
          entries.push({
            record,
            resolved,
            status: "duplicate",
            reason: "Already watched on this date.",
          });
        } else {
          episodeWatchedAt.set(key, [...existingDates, record.watchedAt]);
          entries.push({ record, resolved, status: "ready", reason: null });
        }
        break;
      }
      case "planningItem": {
        const key = `${resolved.mediaType}:${providerId}`;
        if (resolved.mediaType === "movie" && movieWatchedAt.has(providerId)) {
          entries.push({
            record,
            resolved,
            status: "conflict",
            reason: "Already watched — not added to planning.",
          });
        } else if (resolved.mediaType === "show" && trackingStatus.has(providerId)) {
          entries.push({
            record,
            resolved,
            status: "conflict",
            reason: "Already tracked — not added to planning.",
          });
        } else if (planningIntent.has(key)) {
          entries.push({
            record,
            resolved,
            status: "conflict",
            reason: "Already saved — your existing choice was kept.",
          });
        } else {
          planningIntent.set(key, record.intent);
          entries.push({ record, resolved, status: "ready", reason: null });
        }
        break;
      }
      case "showTrackingState": {
        if (trackingStatus.has(providerId)) {
          entries.push({
            record,
            resolved,
            status: "conflict",
            reason: "Tracking state already set — your existing choice was kept.",
          });
        } else {
          trackingStatus.set(providerId, record.status);
          entries.push({ record, resolved, status: "ready", reason: null });
        }
        break;
      }
      case "comment": {
        const key = `${resolved.mediaType}:${providerId}`;
        if (hasComment.has(key)) {
          entries.push({
            record,
            resolved,
            status: "conflict",
            reason: "Comment already exists — your existing comment was kept.",
          });
        } else {
          hasComment.add(key);
          entries.push({ record, resolved, status: "ready", reason: null });
        }
        break;
      }
    }
  }

  return { entries, summary: summarize(entries) };
}

function summarize(entries: readonly PlanEntry[]): PlanSummary {
  const readyByKind: Record<ImportRecordKind, number> = {
    movieWatch: 0,
    episodeWatch: 0,
    planningItem: 0,
    showTrackingState: 0,
    comment: 0,
  };

  const summary: PlanSummary = {
    total: entries.length,
    ready: 0,
    duplicates: 0,
    conflicts: 0,
    needsReview: 0,
    notFound: 0,
    lookupFailed: 0,
    readyByKind,
  };

  for (const entry of entries) {
    switch (entry.status) {
      case "ready":
        summary.ready++;
        readyByKind[entry.record.kind]++;
        break;
      case "duplicate":
        summary.duplicates++;
        break;
      case "conflict":
        summary.conflicts++;
        break;
      case "needsReview":
        summary.needsReview++;
        break;
      case "notFound":
        summary.notFound++;
        break;
      case "lookupFailed":
        summary.lookupFailed++;
        break;
    }
  }

  return summary;
}
