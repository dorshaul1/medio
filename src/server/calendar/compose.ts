import "server-only";
import type { PlanningItem } from "@/server/planning/types";
import { getShowEpisodeProgress } from "@/server/shows/show-episode-progress";
import { getMovieDetails, getShowDetails } from "@/server/tmdb/queries";
import { listEpisodeWatchEventsForShow } from "@/server/tracking/episode-events";
import type { ShowTrackingState } from "@/server/tracking/types";
import { buildEpisodeReleaseEvent, buildMovieReleaseEvent } from "./build-events";
import { getActiveShowCandidates, getPlannedCandidates } from "./candidates";
import { hasAired } from "./date";
import type { ReleaseEvent, ReleaseRelevance } from "./types";

// Turns bounded personal-identity candidates (active tracking + planned
// media) into real release events — the only place Calendar's identity
// and TMDB provider metadata are composed together. See docs/calendar.md,
// "Candidate-first release hydration". `now` is always received, never
// read internally, so every branch here stays deterministic and testable
// (same discipline as the rest of `server/calendar/`).
export async function getCalendarEvents(now: Date): Promise<readonly ReleaseEvent[]> {
  const [activeShows, planned] = await Promise.all([
    getActiveShowCandidates(),
    getPlannedCandidates(),
  ]);

  const [activeEvents, plannedShowEvents, plannedMovieEvents] = await Promise.all([
    Promise.all(activeShows.map((show) => hydrateActiveShowEvents(show, now))),
    Promise.all(planned.shows.map((item) => hydratePlannedShowEvents(item, now))),
    Promise.all(planned.movies.map((item) => hydratePlannedMovieEvents(item, now))),
  ]);

  return [...activeEvents, ...plannedShowEvents, ...plannedMovieEvents].flat();
}

// One actively-tracked show can surface up to two events: an upcoming
// scheduled episode (still in the future), and a "New Episode Available"
// signal — a recently aired episode the user hasn't watched yet. The
// latter is derived from the exact same unified next-episode domain
// Home/Library/Show Details use (getShowEpisodeProgress), never a
// separate calculation — this is what makes a Caught Up show whose next
// episode just aired show up here automatically, with no persisted state
// of its own (see docs/calendar.md, "New Episode Available"). A single
// hydration failure degrades to "no events for this show" rather than
// breaking the rest of Calendar (see docs/library.md, "Missing provider
// media" — the same reasoning applies here).
async function hydrateActiveShowEvents(
  showState: ShowTrackingState,
  now: Date,
): Promise<readonly ReleaseEvent[]> {
  try {
    const [show, events] = await Promise.all([
      getShowDetails(showState.showProviderId),
      listEpisodeWatchEventsForShow({ showProviderId: showState.showProviderId }),
    ]);

    const results: ReleaseEvent[] = [];

    // Upcoming: only while it's still genuinely in the future. An
    // already-aired "next" episode belongs to the recently-released
    // branch below instead, so the same episode is never emitted twice.
    if (show.nextEpisodeToAir && !hasAired(show.nextEpisodeToAir.airDate, now)) {
      const upcoming = buildEpisodeReleaseEvent(show, show.nextEpisodeToAir, "activeShow", now);
      if (upcoming) results.push(upcoming);
    }

    const { progress, episodes } = await getShowEpisodeProgress({
      showProviderId: showState.showProviderId,
      seasons: show.seasons,
      showStatus: show.status,
      explicitState: showState.status,
      events,
      hasKnownFutureEpisode: show.nextEpisodeToAir !== null,
      asOf: now,
    });

    if (progress.nextUnwatchedEpisode) {
      const episode = episodes.find(
        (candidate) =>
          candidate.seasonNumber === progress.nextUnwatchedEpisode?.seasonNumber &&
          candidate.episodeNumber === progress.nextUnwatchedEpisode?.episodeNumber,
      );
      if (episode) {
        const recent = buildEpisodeReleaseEvent(show, episode, "activeShow", now);
        if (recent) results.push(recent);
      }
    }

    return results;
  } catch {
    return [];
  }
}

// A saved-but-not-yet-tracked show only has two kinds of event worth
// surfacing: its next scheduled episode, and a recent premiere (season
// or series) — a plain mid-season episode isn't a meaningful "release" to
// a user who hasn't started watching at all (see docs/calendar.md,
// "Planned show events").
async function hydratePlannedShowEvents(
  item: PlanningItem,
  now: Date,
): Promise<readonly ReleaseEvent[]> {
  try {
    const show = await getShowDetails(item.mediaProviderId);
    const relevance: ReleaseRelevance = item.intent === "backlog" ? "backlogShow" : "watchlistShow";
    const results: ReleaseEvent[] = [];

    if (show.nextEpisodeToAir) {
      const upcoming = buildEpisodeReleaseEvent(show, show.nextEpisodeToAir, relevance, now);
      if (upcoming) results.push(upcoming);
    }

    if (show.lastEpisodeToAir && show.lastEpisodeToAir.episodeNumber === 1) {
      const premiere = buildEpisodeReleaseEvent(show, show.lastEpisodeToAir, relevance, now);
      if (premiere) results.push(premiere);
    }

    return results;
  } catch {
    return [];
  }
}

// A saved movie's one reliable release-date signal — see
// docs/calendar.md, "Movie release semantics" for why this stays a
// single generic date rather than a fabricated theatrical/digital/
// physical breakdown.
async function hydratePlannedMovieEvents(
  item: PlanningItem,
  now: Date,
): Promise<readonly ReleaseEvent[]> {
  try {
    const movie = await getMovieDetails(item.mediaProviderId);
    const relevance: ReleaseRelevance =
      item.intent === "backlog" ? "backlogMovie" : "watchlistMovie";
    const event = buildMovieReleaseEvent(movie, relevance, now);
    return event ? [event] : [];
  } catch {
    return [];
  }
}
