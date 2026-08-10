// MEDIO's own native export format — see docs/data-portability.md,
// "Native export". This is the one shared contract `server/export/
// native.ts` (writer) and `server/import/parsers/native.ts` (reader)
// both depend on; bump `NATIVE_EXPORT_SCHEMA_VERSION` whenever this
// shape changes in a way the reader needs to branch on, and keep the
// reader able to parse at least the previous version (see
// docs/data-portability.md, "Native export versioning").
//
// External identity only — TMDB provider id + media type, exactly the
// same identity the rest of this app already treats as canonical (see
// docs/media-provider.md, "Identifiers") — never an internal database
// row id. `title`/`year` (and `showTitle`/`episodeTitle` for episodes)
// ride along as human-readable fallback metadata only, so the file is
// still meaningful opened outside MEDIO; the importer's own matching
// never depends on them when `providerId` is present.
export const NATIVE_EXPORT_SCHEMA_VERSION = 1;

export type NativeExportMovieWatch = {
  movieProviderId: number;
  title: string;
  year: number | null;
  watchedAt: string; // ISO instant
};

// No separate episode title field — the spec's own "useful fallback
// metadata" list is title/year/season/episode, which for an episode
// means the *show's* title plus the season/episode numbers already
// being stored as real identity; fetching every distinct episode's own
// title just for export would be a whole additional per-episode
// provider-fetch layer for marginal readability gain.
export type NativeExportEpisodeWatch = {
  showProviderId: number;
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  watchedAt: string;
};

export type NativeExportPlanningItem = {
  mediaType: "movie" | "show";
  mediaProviderId: number;
  title: string;
  year: number | null;
  intent: "watchlist" | "backlog";
};

export type NativeExportShowTrackingState = {
  showProviderId: number;
  title: string;
  status: "watching" | "on_hold" | "dropped";
};

export type NativeExportRating = {
  mediaType: "movie" | "show";
  mediaProviderId: number;
  title: string;
  year: number | null;
  rating: number;
};

export type NativeExportNote = {
  mediaType: "movie" | "show";
  mediaProviderId: number;
  title: string;
  year: number | null;
  content: string;
};

// Only present when the user explicitly opts in (see
// docs/data-portability.md, "Preferences import") — media history is
// always the primary export value, preferences are additive.
export type NativeExportPreferences = {
  theme: string;
  density: string;
  motion: string;
  defaultSaveIntent: string;
  spoilerProtection: string;
  homeFocus: string;
  discoverDefaultType: string;
  calendarDefaultView: string;
  showFinishSoon: boolean;
};

export type NativeExportData = {
  movieWatchEvents: readonly NativeExportMovieWatch[];
  episodeWatchEvents: readonly NativeExportEpisodeWatch[];
  planningItems: readonly NativeExportPlanningItem[];
  showTrackingState: readonly NativeExportShowTrackingState[];
  ratings: readonly NativeExportRating[];
  notes: readonly NativeExportNote[];
  preferences: NativeExportPreferences | null;
};

export type NativeExport = {
  schemaVersion: number;
  exportedAt: string;
  data: NativeExportData;
};
