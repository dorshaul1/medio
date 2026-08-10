// Application-owned tracking domain models. Private, user-owned viewing
// data — never mirrors a TMDB DTO and never leaks into shared/public
// caches (see docs/tracking.md). `src/server/db/schema/tracking.ts` is the
// persistence for these; this file is what the rest of the app (and the
// pure domain logic in this directory) actually works with.
import type { ShowTrackingStatusValue } from "@/server/db/schema/tracking";

export type MovieWatchEvent = {
  id: string;
  movieProviderId: number;
  watchedAt: Date;
  createdAt: Date;
};

export type EpisodeWatchEvent = {
  id: string;
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  watchedAt: Date;
  createdAt: Date;
};

// The only persisted show status — re-exported from the schema module so
// callers never need to import `drizzle-orm/pg-core` types directly.
export type ShowTrackingStatus = ShowTrackingStatusValue;

export type ShowTrackingState = {
  showProviderId: number;
  status: ShowTrackingStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type MovieWatchSummary = {
  hasWatched: boolean;
  watchCount: number;
  lastWatchedAt: Date | null;
};

export type EpisodeWatchSummary = {
  hasWatched: boolean;
  watchCount: number;
  lastWatchedAt: Date | null;
};

// Never persisted — always computed from `ShowTrackingStatus` + episode
// watch history + provider show status at read time (see
// derived-state.ts). `on_hold`/`dropped` overlap in name with the
// explicit `ShowTrackingStatus` values (an explicit state *is* one input
// to this), but `unwatched`/`caught_up`/`waiting`/`completed` have no
// persisted counterpart at all.
export type DerivedShowViewingState =
  | "unwatched"
  | "watching"
  | "caught_up"
  | "waiting"
  | "completed"
  | "on_hold"
  | "dropped";

export type EpisodeCoordinate = {
  seasonNumber: number;
  episodeNumber: number;
};

export type ShowProgress = {
  // Regular-season (non-Specials), already-aired episodes only — see
  // relevantAiredEpisodes. Specials are real history when watched, but
  // never part of this denominator.
  airedEpisodeCount: number;
  uniqueWatchedAiredEpisodeCount: number;
  remainingAiredEpisodeCount: number;
  // 0 when airedEpisodeCount is 0 (nothing has aired yet — not a
  // division-by-zero placeholder).
  completionRatio: number;
  lastWatchedEpisode: EpisodeCoordinate | null;
  lastWatchedAt: Date | null;
  derivedViewingState: DerivedShowViewingState;
  // The canonical next unwatched, aired, regular episode — null once
  // nothing aired remains unwatched (or nothing has aired at all). This is
  // domain support for "Up Next"-style product surfaces (see
  // `server/tracking/progress.ts`'s `nextUnwatchedEpisode`); it is never
  // inferred from watch-event creation order or the most recently
  // rewatched episode.
  nextUnwatchedEpisode: EpisodeCoordinate | null;
};
