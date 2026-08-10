// Library view models — what Library UI actually renders. Never a raw DB
// row, never a raw TMDB DTO; composed from Planning + Tracking + provider
// metadata at the application layer (see docs/library.md). A discriminated
// union, not one 35-optional-field type: Movie and Show personal state are
// genuinely different shapes, not the same shape with unused fields.
import type { MediaImage } from "@/server/media/types";
import type { PlanningIntent } from "@/server/planning/types";
import type { DerivedShowViewingState, ShowTrackingStatus } from "@/server/tracking/types";

type LibraryItemBase = {
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  year: number | null;
  // Drives the default "Recently active" sort — see docs/library.md,
  // "Personal activity timestamp".
  personalActivityAt: Date;
  // Drives the "Recently added" sort.
  addedAt: Date;
};

export type PlannedMovieLibraryItem = LibraryItemBase & {
  kind: "planned-movie";
  mediaType: "movie";
  intent: PlanningIntent;
};

export type WatchedMovieLibraryItem = LibraryItemBase & {
  kind: "watched-movie";
  mediaType: "movie";
  watchCount: number;
  lastWatchedAt: Date;
};

export type PlannedShowLibraryItem = LibraryItemBase & {
  kind: "planned-show";
  mediaType: "show";
  intent: PlanningIntent;
};

// Powers Library's own quick "Mark watched"/"Resume" actions — see
// docs/library.md, "Quick tracking". `null` unless `derivedState` is
// `watching` or `on_hold`; in every other state (caught up, waiting,
// completed, dropped, or never started) there's nothing actionable to
// surface, so the extra per-show fetch this requires (see compose.ts) is
// never spent computing it.
export type LibraryNextEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  title: string;
};

export type TrackedShowLibraryItem = LibraryItemBase & {
  kind: "tracked-show";
  mediaType: "show";
  explicitState: ShowTrackingStatus;
  // Derived at Library scale from an *approximate* aired-episode count
  // (see `approximate-progress.ts`) — deliberately less precise than Show
  // Details' own progress, to avoid an N×season provider fetch for every
  // visible show. Good enough for state classification; not presented as
  // an exact figure anywhere that would mislead.
  derivedState: DerivedShowViewingState;
  airedEpisodeCount: number;
  watchedEpisodeCount: number;
  nextEpisode: LibraryNextEpisode | null;
};

export type LibraryItem =
  | PlannedMovieLibraryItem
  | WatchedMovieLibraryItem
  | PlannedShowLibraryItem
  | TrackedShowLibraryItem;

// The coarse grouping the Library's default "All" view organizes around
// (see docs/library.md, "Information architecture") — every LibraryItem
// maps to exactly one. Computed only for the current page's already-
// hydrated items, never as a pre-filter (that would require resolving
// every tracked show's derived state up front).
export type LibraryStateGroup = "in_progress" | "planned" | "paused" | "finished";

export function libraryStateGroup(item: LibraryItem): LibraryStateGroup {
  switch (item.kind) {
    case "planned-movie":
    case "planned-show":
      return "planned";
    case "watched-movie":
      return "finished";
    case "tracked-show":
      switch (item.derivedState) {
        case "unwatched":
        case "watching":
        case "caught_up":
        case "waiting":
          return "in_progress";
        case "on_hold":
        case "dropped":
          return "paused";
        case "completed":
          return "finished";
      }
  }
}
