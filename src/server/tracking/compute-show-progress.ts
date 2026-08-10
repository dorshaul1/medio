// Combines progress.ts's counting/dedup primitives and
// derived-state.ts's status resolution into the one composed
// `ShowProgress` result a product surface actually renders. See
// docs/tracking.md.
import type { Episode } from "@/server/media/types";
import { resolveShowViewingState } from "./derived-state";
import {
  lastWatchedEpisode,
  nextUnwatchedEpisode,
  relevantAiredEpisodes,
  uniqueWatchedEpisodeKeys,
} from "./progress";
import type { EpisodeWatchEvent, ShowProgress, ShowTrackingStatus } from "./types";

export function computeShowProgress(input: {
  // The show's regular-season episodes the caller has fetched — not
  // necessarily every season ever fetched eagerly; see
  // docs/media-provider.md on why Show Details never eagerly fetches
  // every season's episodes. A caller computing progress supplies
  // whatever episode inventory it has gathered for that purpose.
  episodes: readonly Episode[];
  events: readonly EpisodeWatchEvent[];
  explicitState: ShowTrackingStatus | null;
  showStatus: string;
  hasKnownFutureEpisode: boolean;
  asOf?: Date;
}): ShowProgress {
  const asOf = input.asOf ?? new Date();
  const aired = relevantAiredEpisodes(input.episodes, asOf);
  const watchedKeys = uniqueWatchedEpisodeKeys(input.events);
  const uniqueWatchedAired = aired.filter((episode) =>
    watchedKeys.has(`${episode.seasonNumber}:${episode.episodeNumber}`),
  );
  const airedCount = aired.length;
  const watchedCount = uniqueWatchedAired.length;
  const last = lastWatchedEpisode(input.events);

  return {
    airedEpisodeCount: airedCount,
    uniqueWatchedAiredEpisodeCount: watchedCount,
    remainingAiredEpisodeCount: Math.max(airedCount - watchedCount, 0),
    completionRatio: airedCount > 0 ? watchedCount / airedCount : 0,
    lastWatchedEpisode: last
      ? { seasonNumber: last.seasonNumber, episodeNumber: last.episodeNumber }
      : null,
    lastWatchedAt: last?.watchedAt ?? null,
    nextUnwatchedEpisode: nextUnwatchedEpisode({
      episodes: input.episodes,
      events: input.events,
      asOf,
    }),
    derivedViewingState: resolveShowViewingState({
      explicitState: input.explicitState,
      uniqueWatchedAiredCount: watchedCount,
      airedEpisodeCount: airedCount,
      showStatus: input.showStatus,
      hasKnownFutureEpisode: input.hasKnownFutureEpisode,
    }),
  };
}
