import "server-only";
import { getPersonalHome } from "@/server/home/queries";
import type { ActiveShowContinuation } from "@/server/home/types";
import type { ContinueEpisodeCandidate } from "./types";

function toCandidate(
  show: ActiveShowContinuation,
  isFinishSoon: boolean,
): ContinueEpisodeCandidate {
  return {
    kind: "continueEpisode",
    mediaType: "show",
    mediaProviderId: show.showProviderId,
    title: show.title,
    poster: show.poster,
    backdrop: show.backdrop,
    year: show.year,
    // Home's own composition never hydrates full genre metadata (see
    // docs/home.md) — Continue candidates don't need it either: the base
    // continuity score already outranks discovery without a genre
    // bonus (see constants.ts).
    genres: [],
    runtimeMinutes: show.nextEpisode.runtimeMinutes,
    remainingAiredEpisodeCount: show.remainingAiredEpisodeCount,
    isFinishSoon,
    lastActivityAt: show.lastActivityAt,
    nextEpisode: {
      seasonNumber: show.nextEpisode.seasonNumber,
      episodeNumber: show.nextEpisode.episodeNumber,
      episodeProviderId: show.nextEpisode.episodeProviderId,
    },
  };
}

// Reuses Home's own candidate-first composition wholesale — see
// docs/recommendations.md, "Continue pool". Up Next, Finish Soon, and
// Continue Watching already correctly exclude On Hold/Dropped/Completed/
// Caught Up/Waiting shows (see docs/home.md), so Pick never re-derives
// that eligibility itself; it only re-labels the result as candidates.
export async function getContinueCandidates(): Promise<readonly ContinueEpisodeCandidate[]> {
  const home = await getPersonalHome();

  return [
    ...(home.upNext ? [toCandidate(home.upNext, false)] : []),
    ...home.finishSoon.map((show) => toCandidate(show, true)),
    ...home.continueWatching.map((show) => toCandidate(show, false)),
  ];
}
