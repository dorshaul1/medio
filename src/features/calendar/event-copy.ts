import type { ReleaseRelevance } from "@/server/calendar/types";

// Pure copy helpers — no I/O. Kept separate from the row components so
// the exact phrasing rules (what counts as a premiere, which relevance
// tiers get a visible label) are directly unit-testable.

export function episodeCoordinateLabel(episode: {
  seasonNumber: number;
  episodeNumber: number;
  isSeasonPremiere: boolean;
  isShowPremiere: boolean;
}): string {
  if (episode.isShowPremiere) return "Series premiere";
  if (episode.isSeasonPremiere) return `Season ${episode.seasonNumber} premiere`;
  return `S${episode.seasonNumber} E${episode.episodeNumber}`;
}

// Only planned (not-yet-tracked) media gets a visible intent label — an
// actively tracked show's events need no tag, since being here at all
// already implies "you're watching this" (see docs/calendar.md,
// "Personal relevance").
export function relevanceLabel(relevance: ReleaseRelevance): string | null {
  if (relevance === "backlogShow" || relevance === "backlogMovie") return "Backlog";
  if (relevance === "watchlistShow" || relevance === "watchlistMovie") return "Watchlist";
  return null;
}
