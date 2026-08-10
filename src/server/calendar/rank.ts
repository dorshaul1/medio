import { compareDateOnly } from "./date";
import type { ReleaseEventGroup, ReleaseRelevance } from "./types";

// Active Show first, then stronger saved intent (Backlog) before lighter
// intent (Watchlist), Movies last — see docs/calendar.md, "Personal
// relevance ordering". "Caught Up"/"Waiting" aren't distinguished here:
// both are the same `activeShow` relevance, since either way this is a
// show the user is actively engaged with. Provider popularity is never
// a signal.
const RELEVANCE_PRIORITY: Record<ReleaseRelevance, number> = {
  activeShow: 0,
  backlogShow: 1,
  watchlistShow: 2,
  backlogMovie: 3,
  watchlistMovie: 4,
};

function groupRelevance(group: ReleaseEventGroup): number {
  return Math.min(...group.events.map((event) => RELEVANCE_PRIORITY[event.relevance]));
}

function groupTitle(group: ReleaseEventGroup): string {
  const [first] = group.events;
  if (!first) return "";
  return first.kind === "episode" ? first.showTitle : first.movieTitle;
}

// Chronological first (so a multi-day bucket like "This week" reads
// Tuesday, then Friday, ... — see docs/calendar.md, "This week"), then
// same-day personal relevance, then stable title ordering as the final
// deterministic tie-break.
export function rankReleaseGroups(groups: readonly ReleaseEventGroup[]): ReleaseEventGroup[] {
  return [...groups].sort(
    (a, b) =>
      compareDateOnly(a.date, b.date) ||
      groupRelevance(a) - groupRelevance(b) ||
      groupTitle(a).localeCompare(groupTitle(b)),
  );
}
