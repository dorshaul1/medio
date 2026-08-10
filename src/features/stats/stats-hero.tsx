import type { TasteHeadline, TasteOverview, ViewingTimeEstimate } from "@/server/stats/types";

// The page's opening statement — see docs/stats.md, "Opening area". Not
// four KPI cards: one grounded headline sentence, in strong editorial
// type, plus a single quiet supporting line of counts (and an estimated
// viewing-time figure, only when confident enough to show at all).
// `computeTasteHeadline` (server/stats/headline.ts) already decided
// *which* claim is truthfully supportable; this only supplies the exact
// English sentence for each case, matching CLAUDE.md's "insight copy"
// rules — plain, grounded, never analytics jargon and never an
// interpretation the data doesn't actually support.
function headlineCopy(headline: TasteHeadline): string {
  switch (headline.kind) {
    case "contrast":
      return `${headline.mostWatchedGenre} is what you watch most — but ${headline.highestRatedGenre} is what you rate highest.`;
    case "highest_rated_genre":
      return `${headline.genre} is your highest-rated genre.`;
    case "most_watched_genre":
      return `You watch mostly ${headline.genre}.`;
    case "favorite_director":
      return `${headline.name} is your favorite director so far.`;
    case "sparse":
      return "Your stats will take shape as you watch and rate more.";
  }
}

// Always an approximation — see server/stats/viewing-time.ts — so this
// never claims false precision ("342 hours 17 minutes"), only a rounded
// "~N hours" figure, and only once coverage clears its threshold.
function formatEstimatedHours(estimate: ViewingTimeEstimate): string {
  const hours = Math.max(1, Math.round(estimate.minutes / 60));
  return `~${hours} ${hours === 1 ? "hour" : "hours"} watched`;
}

export function StatsHero({
  headline,
  overview,
  estimatedViewingTime,
}: {
  headline: TasteHeadline;
  overview: TasteOverview;
  estimatedViewingTime: ViewingTimeEstimate | null;
}) {
  const parts = [
    `${overview.uniqueMoviesWatched} ${overview.uniqueMoviesWatched === 1 ? "movie" : "movies"}`,
    `${overview.uniqueShowsWatched} ${overview.uniqueShowsWatched === 1 ? "show" : "shows"}`,
    `${overview.uniqueEpisodesWatched} ${overview.uniqueEpisodesWatched === 1 ? "episode" : "episodes"}`,
  ];
  if (estimatedViewingTime) parts.push(formatEstimatedHours(estimatedViewingTime));

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-2xl text-2xl leading-tight font-medium tracking-tight text-balance sm:text-3xl">
        {headlineCopy(headline)}
      </p>
      <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p>
    </div>
  );
}
