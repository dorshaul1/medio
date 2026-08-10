import type { MediaImage } from "@/server/media/types";

// One shape shared by Up Next, Continue Watching, and Finish Soon — all
// three are literally the same kind of fact ("an active show with a
// canonical next unwatched aired episode"), just placed into different
// Home buckets by `getPersonalHome`. Not a raw DB row, not a TMDB DTO —
// composed from both (see docs/home.md). Deliberately excludes the next
// episode's overview — Home never reveals unwatched-episode plot details
// (see docs/home.md, "Spoiler safety").
export type ActiveShowContinuation = {
  showProviderId: number;
  title: string;
  poster: MediaImage | null;
  backdrop: MediaImage | null;
  year: number | null;
  // Drives candidate ordering — see `server/tracking/show-state.ts`'s
  // `listWatchingShows`.
  lastActivityAt: Date;
  airedEpisodeCount: number;
  watchedEpisodeCount: number;
  remainingAiredEpisodeCount: number;
  nextEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    episodeProviderId: number;
    title: string;
    runtimeMinutes: number | null;
  };
};

export type PersonalHome = {
  // The single strongest next episode to continue, or null when the user
  // has no eligible active show at all.
  upNext: ActiveShowContinuation | null;
  // Other active shows with very little unwatched content left — see
  // docs/home.md, "Finish Soon".
  finishSoon: readonly ActiveShowContinuation[];
  // Every other eligible active show, most recently active first. Never
  // includes `upNext` or any `finishSoon` item — see docs/home.md,
  // "Personalized-section deduplication".
  continueWatching: readonly ActiveShowContinuation[];
};
