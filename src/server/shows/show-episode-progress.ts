import "server-only";
import type { Episode, SeasonSummary } from "@/server/media/types";
import { getSeasonDetails } from "@/server/tmdb/queries";
import { computeShowProgress } from "@/server/tracking/compute-show-progress";
import type { EpisodeWatchEvent, ShowProgress, ShowTrackingStatus } from "@/server/tracking/types";

export type ShowEpisodeProgress = {
  progress: ShowProgress;
  // The episode inventory this progress was computed from — callers that
  // also need the actual next-unwatched episode's title/runtime (not just
  // its season/episode coordinate) look it up here instead of issuing a
  // separate fetch.
  episodes: readonly Episode[];
};

// Fetches every regular season's episodes for one show and computes exact
// progress from real per-episode air dates — the one place this
// application accepts an N-season provider fetch for a single show (see
// docs/media-provider.md, "Show Details never eagerly fetches every
// season's episodes" for why that stays the rule everywhere else).
// Written once, shared by Show Details
// (`features/shows/show-tracking-view.ts`) and personalized Home's
// bounded active-show candidates (`server/home/`) — neither reimplements
// this fetch-and-compute logic on its own.
export async function getShowEpisodeProgress(input: {
  showProviderId: number;
  seasons: readonly SeasonSummary[];
  showStatus: string;
  explicitState: ShowTrackingStatus | null;
  events: readonly EpisodeWatchEvent[];
  // ShowDetails' own `next_episode_to_air` — the caller already has this
  // from the same Show Details fetch that provided `seasons`/`showStatus`,
  // so this never triggers a request of its own. This is what actually
  // makes `waiting` a real, distinct state from `caught_up` (see
  // docs/tracking.md, `hasKnownFutureEpisode`) — previously always
  // `false` because this field wasn't wired up yet.
  hasKnownFutureEpisode: boolean;
  // Optional injected "now", threaded straight to `computeShowProgress`.
  // Home/Library never pass this — real wall-clock time is always the
  // right answer for them. Calendar does pass it, since its whole design
  // never fabricates "now" internally (see docs/calendar.md) and needs
  // this same unified progress computation to stay deterministic and
  // testable end to end.
  asOf?: Date;
}): Promise<ShowEpisodeProgress> {
  const regularSeasons = input.seasons.filter((season) => season.seasonNumber !== 0);

  const seasonDetailsList = await Promise.all(
    regularSeasons.map((season) =>
      getSeasonDetails(input.showProviderId, season.seasonNumber).catch(() => null),
    ),
  );

  const episodes: Episode[] = seasonDetailsList
    .filter((season): season is NonNullable<typeof season> => season !== null)
    .flatMap((season) => season.episodes);

  const progress = computeShowProgress({
    episodes,
    events: input.events,
    explicitState: input.explicitState,
    showStatus: input.showStatus,
    hasKnownFutureEpisode: input.hasKnownFutureEpisode,
    ...(input.asOf ? { asOf: input.asOf } : {}),
  });

  return { progress, episodes };
}
