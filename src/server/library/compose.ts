import "server-only";
import type { ShowDetails } from "@/server/media/types";
import { getShowEpisodeProgress } from "@/server/shows/show-episode-progress";
import { getMovieDetails, getShowDetails } from "@/server/tmdb/queries";
import { resolveShowViewingState } from "@/server/tracking/derived-state";
import { listEpisodeWatchEventsForShow } from "@/server/tracking/episode-events";
import type { ShowTrackingStatus } from "@/server/tracking/types";
import { approximateAiredEpisodeCount } from "./approximate-progress";
import type { LibraryCandidate } from "./candidates";
import { getWatchedEpisodeCountsByShow } from "./candidates";
import type { LibraryItem, LibraryNextEpisode } from "./types";

// Turns one page of personal-identity candidates into real Library view
// models — the only place Planning/Tracking identity and TMDB provider
// metadata are composed together (see docs/library.md). Never sends a raw
// candidate row or a TMDB DTO to UI code.
export async function composeLibraryItems(
  userId: string,
  candidates: readonly LibraryCandidate[],
): Promise<readonly LibraryItem[]> {
  // Defensive de-dup by (mediaType, mediaProviderId) — the planning/
  // tracking transition rules should already prevent a title appearing
  // from two sources at once, but composition doesn't rely on that alone
  // (see docs/library.md, "Deduplication").
  const deduped = dedupeCandidates(candidates);

  const showIds = deduped
    .filter((candidate) => candidate.mediaType === "show")
    .map((candidate) => candidate.mediaProviderId);
  const watchedEpisodeCounts = await getWatchedEpisodeCountsByShow(userId, showIds);

  // One provider fetch per visible title, in parallel — bounded by page
  // size (see `queries.ts`), never per-season/per-episode (see
  // docs/architecture.md).
  const items = await Promise.all(
    deduped.map((candidate) => composeOne(candidate, watchedEpisodeCounts)),
  );

  return items.filter((item): item is LibraryItem => item !== null);
}

function dedupeCandidates(candidates: readonly LibraryCandidate[]): readonly LibraryCandidate[] {
  const seen = new Map<string, LibraryCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.mediaType}:${candidate.mediaProviderId}`;
    if (!seen.has(key)) seen.set(key, candidate);
  }
  return [...seen.values()];
}

// Returns `null` when provider hydration fails for this one title (TMDB
// error, or the title has since become unavailable) — never lets one bad
// title take down the whole Library page (see docs/library.md, "Missing
// provider media"). The underlying planning/tracking row is never touched
// just because hydration failed once.
async function composeOne(
  candidate: LibraryCandidate,
  watchedEpisodeCounts: ReadonlyMap<number, number>,
): Promise<LibraryItem | null> {
  try {
    if (candidate.mediaType === "movie") {
      const movie = await getMovieDetails(candidate.mediaProviderId);
      const base = {
        mediaType: "movie" as const,
        mediaProviderId: candidate.mediaProviderId,
        title: movie.title,
        poster: movie.poster,
        year: movie.releaseYear,
        personalActivityAt: candidate.personalActivityAt,
        addedAt: candidate.addedAt,
      };

      if (candidate.kind === "watched-movie") {
        return {
          ...base,
          kind: "watched-movie",
          watchCount: candidate.watchCount ?? 0,
          lastWatchedAt: candidate.personalActivityAt,
        };
      }
      if (candidate.intent === null) return null;
      return { ...base, kind: "planned-movie", intent: candidate.intent };
    }

    const show = await getShowDetails(candidate.mediaProviderId);
    const base = {
      mediaType: "show" as const,
      mediaProviderId: candidate.mediaProviderId,
      title: show.title,
      poster: show.poster,
      year: show.firstAirYear,
      personalActivityAt: candidate.personalActivityAt,
      addedAt: candidate.addedAt,
    };

    if (candidate.kind === "planned-show") {
      if (candidate.intent === null) return null;
      return { ...base, kind: "planned-show", intent: candidate.intent };
    }

    if (candidate.trackingStatus === null) return null;
    const airedEpisodeCount = approximateAiredEpisodeCount(show.seasons);
    const watchedEpisodeCount = watchedEpisodeCounts.get(candidate.mediaProviderId) ?? 0;
    const derivedState = resolveShowViewingState({
      explicitState: candidate.trackingStatus,
      uniqueWatchedAiredCount: watchedEpisodeCount,
      airedEpisodeCount,
      showStatus: show.status,
      // Same signal Home/Show Details/Calendar all read — see
      // docs/tracking.md, `hasKnownFutureEpisode`.
      hasKnownFutureEpisode: show.nextEpisodeToAir !== null,
    });

    // Only a show the user could plausibly act on right now (still
    // watching, or paused mid-way) is worth the extra per-show fetch this
    // requires — everything else (caught up, waiting, completed, dropped,
    // never started) has nothing to resume, so this stays bounded to the
    // page's genuinely active shows rather than every visible one.
    const nextEpisode =
      derivedState === "watching" || derivedState === "on_hold"
        ? await fetchNextEpisode(candidate.mediaProviderId, show, candidate.trackingStatus)
        : null;

    return {
      ...base,
      kind: "tracked-show",
      explicitState: candidate.trackingStatus,
      derivedState,
      airedEpisodeCount,
      watchedEpisodeCount,
      nextEpisode,
    };
  } catch {
    return null;
  }
}

// The one place Library accepts the same per-show N-season provider
// fetch Home's `hydrateCandidate` does (via the shared
// `getShowEpisodeProgress` — see docs/architecture.md, `server/shows/`) —
// bounded to the small subset of visible shows that are actually
// watching/on_hold (see the caller). A failure here degrades to "no quick
// action for this one show" rather than breaking the row.
async function fetchNextEpisode(
  showProviderId: number,
  show: ShowDetails,
  explicitState: ShowTrackingStatus,
): Promise<LibraryNextEpisode | null> {
  try {
    const events = await listEpisodeWatchEventsForShow({ showProviderId });
    const { progress, episodes } = await getShowEpisodeProgress({
      showProviderId,
      seasons: show.seasons,
      showStatus: show.status,
      explicitState,
      events,
      hasKnownFutureEpisode: show.nextEpisodeToAir !== null,
    });

    if (!progress.nextUnwatchedEpisode) return null;
    const episode = episodes.find(
      (candidate) =>
        candidate.seasonNumber === progress.nextUnwatchedEpisode?.seasonNumber &&
        candidate.episodeNumber === progress.nextUnwatchedEpisode?.episodeNumber,
    );
    if (!episode) return null;

    return {
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      episodeProviderId: episode.id,
      title: episode.title,
    };
  } catch {
    return null;
  }
}
