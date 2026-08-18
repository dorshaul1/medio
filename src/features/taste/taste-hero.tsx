import type { TasteHeadline, TasteOverview, ViewingTimeEstimate } from "@/server/stats/types";

// The Taste page's opening statement — see docs/taste.md, "Hero headline".
// One grounded headline sentence in strong editorial type, plus a single
// quiet supporting line of counts (and an estimated viewing-time figure,
// only when confident enough to show at all). Not four KPI cards.
function headlineCopy(headline: TasteHeadline): string {
  switch (headline.kind) {
    case "most_watched_genre":
      return `You watch mostly ${headline.genre}.`;
    case "favorite_director":
      return `${headline.name} shows up the most in what you watch.`;
    case "favorite_actor":
      return `${headline.name} keeps appearing in your watch history.`;
    case "sparse":
      return "Your taste profile will take shape as you watch more.";
  }
}

function formatEstimatedHours(estimate: ViewingTimeEstimate): string {
  const hours = Math.max(1, Math.round(estimate.minutes / 60));
  return `~${hours} ${hours === 1 ? "hour" : "hours"} watched`;
}

export function TasteHero({
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
      <p className="font-display max-w-2xl text-2xl leading-tight font-medium tracking-tight text-balance sm:text-3xl">
        {headlineCopy(headline)}
      </p>
      {headline.kind !== "sparse" ? (
        <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p>
      ) : null}
    </div>
  );
}
