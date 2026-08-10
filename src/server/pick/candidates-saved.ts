import "server-only";
import { listPlanningItems } from "@/server/planning/planning-items";
import { getMovieDetails, getShowDetails } from "@/server/tmdb/queries";
import { PICK_SAVED_CANDIDATE_LIMIT } from "./constants";
import type { SavedMovieCandidate, SavedShowCandidate } from "./types";

// Saved (Watchlist + Backlog) candidates — no exclusion filtering is
// needed here: starting/watching planned media clears its planning entry
// in the same transaction (see docs/library.md, "Planning clears when
// tracking starts"), so a planning item can never simultaneously be
// something the user already started. A single title's hydration
// failure is swallowed, not thrown — the same graceful-degradation
// contract every other provider-dependent read in this app applies (see
// server/home/queries.ts).
export async function getSavedCandidates(): Promise<{
  movies: readonly SavedMovieCandidate[];
  shows: readonly SavedShowCandidate[];
}> {
  const items = await listPlanningItems(PICK_SAVED_CANDIDATE_LIMIT);

  const movies = await Promise.all(
    items
      .filter((item) => item.mediaType === "movie")
      .map(async (item): Promise<SavedMovieCandidate | null> => {
        try {
          const details = await getMovieDetails(item.mediaProviderId);
          return {
            kind: "savedMovie",
            mediaType: "movie",
            mediaProviderId: item.mediaProviderId,
            title: details.title,
            poster: details.poster,
            backdrop: details.backdrop,
            year: details.releaseYear,
            genres: details.genres,
            runtimeMinutes: details.runtimeMinutes,
            intent: item.intent,
          };
        } catch {
          return null;
        }
      }),
  );

  const shows = await Promise.all(
    items
      .filter((item) => item.mediaType === "show")
      .map(async (item): Promise<SavedShowCandidate | null> => {
        try {
          const details = await getShowDetails(item.mediaProviderId);
          return {
            kind: "savedShow",
            mediaType: "show",
            mediaProviderId: item.mediaProviderId,
            title: details.title,
            poster: details.poster,
            backdrop: details.backdrop,
            year: details.firstAirYear,
            genres: details.genres,
            runtimeMinutes: details.episodeRuntimeMinutes,
            intent: item.intent,
          };
        } catch {
          return null;
        }
      }),
  );

  return {
    movies: movies.filter((movie): movie is SavedMovieCandidate => movie !== null),
    shows: shows.filter((show): show is SavedShowCandidate => show !== null),
  };
}
