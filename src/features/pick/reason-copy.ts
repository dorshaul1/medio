import { pluralize } from "@/features/shows/pluralize";
import type { ReasonFact } from "@/server/pick/types";

// Converts a structured `ReasonFact` into display copy — the one place
// that happens, mirroring the existing `diary-ordinal.ts` precedent (see
// docs/recommendations.md, "Reason facts"). The domain layer never
// builds a string itself, so this is the only file that needs to change
// if the wording ever does.
export function reasonCopy(reason: ReasonFact): string {
  switch (reason.kind) {
    case "continueActiveShow":
      return "Continue where you left off";
    case "recentContinuation":
      if (reason.daysAgo === 0) return "You watched an episode today";
      if (reason.daysAgo === 1) return "You watched an episode yesterday";
      return "You watched an episode a couple of days ago";
    case "finishSoon":
      return `Only ${pluralize(reason.remainingEpisodes, "episode")} left`;
    case "backlogIntent":
      return "On your Backlog";
    case "watchlistIntent":
      return "On your Watchlist";
    case "highGenreAffinity":
      return `You watch a lot of ${reason.genreName}`;
    case "directorAffinity":
      return `From ${reason.directorName}, one of your favorite directors`;
    case "timeFit":
      return `About ${reason.minutes} min`;
    case "similarToWatched":
      return `More like ${reason.title}`;
    case "popularDiscovery":
      return "Popular right now";
  }
}
