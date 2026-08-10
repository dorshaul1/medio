import "server-only";
import { getShowEpisodeProgress } from "@/server/shows/show-episode-progress";
import { getShowDetails } from "@/server/tmdb/queries";
import { listEpisodeWatchEventsForShow } from "@/server/tracking/episode-events";
import { listWatchingShows } from "@/server/tracking/show-state";
import type { ShowTrackingState } from "@/server/tracking/types";
import { classifyActiveShows } from "./classify";
import { HOME_ACTIVE_SHOW_CANDIDATE_LIMIT } from "./constants";
import type { ActiveShowContinuation, PersonalHome } from "./types";

// Hydrates one candidate show's provider metadata + exact episode
// progress, and shapes it into the one Home continuation model — or
// `null` when the show isn't actually eligible to continue (fully caught
// up/waiting/completed — see docs/home.md) or its provider hydration
// failed. A single failure here is swallowed, not thrown: one bad title
// must never take down the rest of personalized Home, and the user's
// underlying tracking state is never touched just because hydration
// failed once (see docs/library.md, "Missing provider media" — the same
// reasoning applies here).
async function hydrateCandidate(
  showState: ShowTrackingState,
): Promise<ActiveShowContinuation | null> {
  try {
    const [show, events] = await Promise.all([
      getShowDetails(showState.showProviderId),
      listEpisodeWatchEventsForShow({ showProviderId: showState.showProviderId }),
    ]);

    const { progress, episodes } = await getShowEpisodeProgress({
      showProviderId: showState.showProviderId,
      seasons: show.seasons,
      showStatus: show.status,
      explicitState: showState.status,
      events,
      hasKnownFutureEpisode: show.nextEpisodeToAir !== null,
    });

    // Only a show still genuinely "watching" (not caught up, not
    // waiting, not completed) has anything currently available to
    // continue — see docs/home.md, "Eligibility".
    if (progress.derivedViewingState !== "watching") return null;
    if (!progress.nextUnwatchedEpisode) return null;

    const nextEpisode = episodes.find(
      (episode) =>
        episode.seasonNumber === progress.nextUnwatchedEpisode?.seasonNumber &&
        episode.episodeNumber === progress.nextUnwatchedEpisode?.episodeNumber,
    );
    if (!nextEpisode) return null;

    return {
      showProviderId: showState.showProviderId,
      title: show.title,
      poster: show.poster,
      backdrop: show.backdrop,
      year: show.firstAirYear,
      lastActivityAt: showState.updatedAt,
      airedEpisodeCount: progress.airedEpisodeCount,
      watchedEpisodeCount: progress.uniqueWatchedAiredEpisodeCount,
      remainingAiredEpisodeCount: progress.remainingAiredEpisodeCount,
      nextEpisode: {
        seasonNumber: nextEpisode.seasonNumber,
        episodeNumber: nextEpisode.episodeNumber,
        episodeProviderId: nextEpisode.id,
        title: nextEpisode.title,
        runtimeMinutes: nextEpisode.runtimeMinutes,
      },
    };
  } catch {
    return null;
  }
}

// Personalized Home's one reusable read — see docs/home.md. Candidate-
// first: cheaply queries private state to find a bounded set of
// recently-active "watching" shows (on_hold/dropped excluded at the SQL
// level), hydrates only those with provider metadata, derives exact
// progress from real per-episode air dates, then classifies into Up
// Next / Finish Soon / Continue Watching with strict precedence so no
// show ever appears in more than one bucket.
export async function getPersonalHome(): Promise<PersonalHome> {
  const candidates = await listWatchingShows(HOME_ACTIVE_SHOW_CANDIDATE_LIMIT);

  // Parallel, bounded to the candidate limit above — never per-episode,
  // never every season of every show the user has ever tracked.
  const hydrated = await Promise.all(candidates.map(hydrateCandidate));
  // `Promise.all` preserves input order, and `listWatchingShows` already
  // ordered candidates by most-recent activity — so `eligible` stays in
  // that same recency order with no further sort needed.
  const eligible = hydrated.filter((item): item is ActiveShowContinuation => item !== null);

  return classifyActiveShows(eligible);
}
