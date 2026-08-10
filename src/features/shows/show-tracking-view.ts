import "server-only";
import type { Episode, SeasonSummary } from "@/server/media/types";
import { getShowEpisodeProgress } from "@/server/shows/show-episode-progress";
import { listEpisodeWatchEventsForShow } from "@/server/tracking/episode-events";
import { getShowTrackingState } from "@/server/tracking/show-state";
import type { ShowProgress, ShowTrackingState } from "@/server/tracking/types";

// Composes public TMDB media data with private tracking data into one
// view model for Show Details — the one place that boundary is crossed
// (see docs/tracking.md, "Media + tracking composition boundary"). Never
// the reverse: `src/server/tracking/` never imports TMDB, and
// `src/server/tmdb/` never knows watch events exist.
export type ShowTrackingView = {
  explicitState: ShowTrackingState | null;
  progress: ShowProgress;
  // The same per-regular-season episode inventory `progress` was computed
  // from (see `getShowEpisodeProgress`) — exposed so the whole-show "Mark
  // all watched" bulk action (features/shows/mark-show-watched-control.tsx)
  // can build its aired-episode list from data already fetched here,
  // rather than issuing its own per-season fetch on click.
  episodes: readonly Episode[];
};

// Show Details' primary render never eagerly fetches every season's
// episodes (see docs/media-provider.md) — the progress figure here is the
// one deliberate exception, deferred behind its own Suspense boundary so
// it never blocks the rest of the page. The actual per-season fetch lives
// in `getShowEpisodeProgress` (server/shows/), shared with personalized
// Home's active-show candidates rather than duplicated here. The Seasons
// row itself (features/shows/season-row.tsx) deliberately does not wait
// on this — it's the primary product surface and stays synchronous with
// only `show.seasons`; per-season progress tags are a deferred follow-up,
// not implemented here yet (see the Phase 12 summary).
export async function getShowTrackingView(input: {
  showProviderId: number;
  seasons: readonly SeasonSummary[];
  showStatus: string;
  // ShowDetails' own `nextEpisodeToAir` — the caller already has this
  // from the same fetch that provided `seasons`/`showStatus` (see
  // docs/tracking.md, `hasKnownFutureEpisode`).
  nextEpisodeToAir: Episode | null;
}): Promise<ShowTrackingView> {
  const [events, explicitState] = await Promise.all([
    listEpisodeWatchEventsForShow({ showProviderId: input.showProviderId }),
    getShowTrackingState(input.showProviderId),
  ]);

  const { progress, episodes } = await getShowEpisodeProgress({
    showProviderId: input.showProviderId,
    seasons: input.seasons,
    showStatus: input.showStatus,
    explicitState: explicitState?.status ?? null,
    events,
    hasKnownFutureEpisode: input.nextEpisodeToAir !== null,
  });

  return { explicitState, progress, episodes };
}
