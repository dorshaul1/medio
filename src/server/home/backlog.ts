import "server-only";
import type { PlanningItem } from "@/server/planning/types";
import { listPlanningItems } from "@/server/planning/planning-items";
import { getMovieDetails, getShowDetails } from "@/server/tmdb/queries";
import { HOME_BACKLOG_CANDIDATE_LIMIT, HOME_BACKLOG_ROW_LIMIT } from "./constants";
import type { HomeBacklogItem } from "./types";

// Personal mode's Backlog row — see docs/home.md, "Personal mode".
// Reuses Planning's existing broad `listPlanningItems` read and filters
// to intent downstream, the same convention `server/calendar/candidates.ts`
// and `server/pick/candidates-saved.ts` already establish, rather than a
// new intent-filtered query function. Backlog specifically, never
// Watchlist — Backlog is the stronger "I intend to watch this" signal
// (see CLAUDE.md, "Library"); Watchlist is lighter saved interest and a
// weaker fit for a "what should I get to next" Home nudge.
export async function getHomeBacklogPreview(): Promise<readonly HomeBacklogItem[]> {
  const items = await listPlanningItems(HOME_BACKLOG_CANDIDATE_LIMIT);
  // Already ordered most-recently-changed first (see `listPlanningItems`).
  const backlog = items
    .filter((item) => item.intent === "backlog")
    .slice(0, HOME_BACKLOG_ROW_LIMIT);

  const hydrated = await Promise.all(backlog.map(hydrateBacklogItem));
  return hydrated.filter((item): item is HomeBacklogItem => item !== null);
}

// A single hydration failure degrades to "this title just isn't in the
// row" rather than breaking the rest of Home — same reasoning as every
// other candidate-first hydration in this app (see docs/library.md,
// "Missing provider media").
async function hydrateBacklogItem(item: PlanningItem): Promise<HomeBacklogItem | null> {
  try {
    if (item.mediaType === "movie") {
      const movie = await getMovieDetails(item.mediaProviderId);
      return {
        mediaType: "movie",
        mediaProviderId: item.mediaProviderId,
        title: movie.title,
        poster: movie.poster,
        year: movie.releaseYear,
      };
    }

    const show = await getShowDetails(item.mediaProviderId);
    return {
      mediaType: "show",
      mediaProviderId: item.mediaProviderId,
      title: show.title,
      poster: show.poster,
      year: show.firstAirYear,
    };
  } catch {
    return null;
  }
}
