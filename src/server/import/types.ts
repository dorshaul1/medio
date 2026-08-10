// Import's own normalized domain models — see docs/data-portability.md.
// Every source parser (native/Letterboxd/generic CSV) maps its raw rows
// into these shapes; nothing downstream of a parser (matching, planning,
// persistence) ever branches on which source produced a record — see
// CLAUDE.md, "No import source in core WatchEvent semantics".

import type { ImportSourceValue } from "@/server/db/schema/import";
import type { MediaImage, MediaType } from "@/server/media/types";

export type ImportSource = ImportSourceValue;

// The current version of this normalized model + plan-building logic —
// distinct from a native export file's own `schemaVersion` (see
// `server/export/types.ts`). Bumped only if the plan/record shapes
// themselves change in a way future code needs to branch on.
export const IMPORT_MODEL_VERSION = 1;

// A record's media identity, before resolution. `known` is only ever
// produced by the native parser (a MEDIO export already carries real
// provider identity — the "highest-fidelity path", see
// docs/data-portability.md); every other source can only offer a
// title/year query, which `server/import/matching.ts` resolves.
export type MediaIdentityRef =
  | { kind: "known"; mediaType: MediaType; providerId: number }
  | { kind: "titleYear"; mediaType: MediaType; title: string; year: number | null };

// Date precision this record's source actually provided — carried
// through to the plan/preview so date-only imprecision is documented,
// never silently presented as exact (see docs/data-portability.md,
// "Watch timestamps").
export type DatePrecision = "exact" | "dateOnly";

type ImportedRecordCommon = {
  identity: MediaIdentityRef;
};

export type ImportedMovieWatch = ImportedRecordCommon & {
  kind: "movieWatch";
  watchedAt: Date;
  datePrecision: DatePrecision;
};

export type ImportedEpisodeWatch = ImportedRecordCommon & {
  kind: "episodeWatch";
  seasonNumber: number;
  episodeNumber: number;
  // Only ever present for the native source (a MEDIO export already
  // carries TMDB's own episode id) — Letterboxd/CSV sources have no way
  // to supply this, and matching never invents one; see
  // `server/import/plan.ts` for how episode identity is otherwise
  // resolved (via the show's already-fetched season episode list).
  episodeProviderId: number | null;
  watchedAt: Date;
  datePrecision: DatePrecision;
};

export type ImportedPlanningItem = ImportedRecordCommon & {
  kind: "planningItem";
  intent: "watchlist" | "backlog";
};

export type ImportedShowTrackingState = ImportedRecordCommon & {
  kind: "showTrackingState";
  status: "watching" | "on_hold" | "dropped";
};

export type ImportedRating = ImportedRecordCommon & {
  kind: "rating";
  rating: number;
  // Set only when the source scale required a conversion (e.g.
  // Letterboxd's 0.5–5 half-star scale rounded to MEDIO's 1–5 integer
  // scale) — surfaced in the preview so the conversion is never silent
  // (see docs/data-portability.md, "Letterboxd ratings").
  sourceRatingLabel: string | null;
};

export type ImportedNote = ImportedRecordCommon & {
  kind: "note";
  content: string;
};

export type ParsedImportRecord =
  | ImportedMovieWatch
  | ImportedEpisodeWatch
  | ImportedPlanningItem
  | ImportedShowTrackingState
  | ImportedRating
  | ImportedNote;

export type ImportRecordKind = ParsedImportRecord["kind"];

// A row the parser could not understand at all — reported to the user,
// never silently dropped (see docs/data-portability.md, "Import
// errors").
export type ImportParseError = {
  // 1-based source row/line number, for a user reading their own file.
  row: number;
  reason: string;
};

export type ParseResult = {
  records: readonly ParsedImportRecord[];
  errors: readonly ImportParseError[];
};

// One resolved candidate a `needsReview` entry could actually mean —
// deliberately small (id/title/year/poster only, no fake confidence
// score — see docs/data-portability.md, "Import matching confidence").
export type MatchCandidate = {
  mediaType: MediaType;
  providerId: number;
  title: string;
  year: number | null;
  poster: MediaImage | null;
};

// The outcome of resolving one `titleYear` identity ref against the
// provider — never a fuzzy-confidence percentage, only these deterministic
// states (see docs/data-portability.md, "Import matching confidence").
export type ResolvedIdentity =
  | {
      status: "resolved";
      mediaType: MediaType;
      providerId: number;
      title: string;
      year: number | null;
      poster: MediaImage | null;
    }
  | { status: "needsReview"; candidates: readonly MatchCandidate[] }
  | { status: "notFound" }
  // Distinct from `notFound` — the provider itself was unavailable, not
  // "genuinely no match" (see docs/data-portability.md, "Provider
  // failure"). Retryable.
  | { status: "lookupFailed" };

// The one small, human-readable outcome taxonomy the whole import UI
// renders from — never a fake match percentage (see
// docs/data-portability.md, "Import matching confidence").
export type PlanEntryStatus =
  | "ready"
  | "duplicate"
  | "conflict"
  | "needsReview"
  | "notFound"
  | "lookupFailed";

export type PlanEntry = {
  record: ParsedImportRecord;
  // The identity this entry resolved to — for a native `known` ref this
  // is synthesized directly from the ref (no provider round trip
  // needed); for a `titleYear` ref this is `matching.ts`'s own result.
  resolved: ResolvedIdentity;
  status: PlanEntryStatus;
  // Plain-language explanation for `duplicate`/`conflict` entries — e.g.
  // "Already watched on this date", "Rating already set" — never a
  // generic "skipped".
  reason: string | null;
};

export type PlanSummary = {
  total: number;
  ready: number;
  duplicates: number;
  conflicts: number;
  needsReview: number;
  notFound: number;
  lookupFailed: number;
  // Per-kind counts of only the entries that would actually be created —
  // what the confirmation screen shows ("530 watch events, 24 Watchlist
  // items, 18 ratings"), never a generic "Import 572 items?" total (see
  // docs/data-portability.md, "Confirmation").
  readyByKind: Record<ImportRecordKind, number>;
};

export type ImportPlan = {
  entries: readonly PlanEntry[];
  summary: PlanSummary;
};
