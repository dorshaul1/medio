import type { TasteOverview, ViewingTimeEstimate } from "@/server/stats/types";
import { formatStatsRangeLabel } from "@/server/stats/range";
import type { StatsRange } from "@/server/stats/range";

// Stats' opening area — viewing volume for the selected range (see
// docs/stats.md). Deliberately not a taste headline: personal taste
// insight lives on the Taste tab; Overview is temporal viewing activity.
function formatEstimatedHours(estimate: ViewingTimeEstimate): string {
  const hours = Math.max(1, Math.round(estimate.minutes / 60));
  return `~${hours} ${hours === 1 ? "hour" : "hours"} watched`;
}

function StatNumber({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-4xl font-medium tracking-tight tabular-nums sm:text-5xl">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// Rewatch/event volume beyond unique titles — see CLAUDE.md, "Stats":
// unique-title counts and viewing-event counts are always distinct
// figures, never conflated. Only rendered once there's something to say
// (a real rewatch happened) rather than a permanent "0 rewatches" line.
function rewatchSummary(overview: TasteOverview): string | null {
  const totalEvents = overview.movieWatchEventCount + overview.episodeWatchEventCount;
  const rewatchEvents = totalEvents - overview.uniqueMoviesWatched - overview.uniqueEpisodesWatched;
  if (rewatchEvents <= 0) return null;
  return `${totalEvents} viewing events, including ${rewatchEvents} ${rewatchEvents === 1 ? "rewatch" : "rewatches"}`;
}

export function StatsHero({
  range,
  overview,
  estimatedViewingTime,
}: {
  range: StatsRange;
  overview: TasteOverview;
  estimatedViewingTime: ViewingTimeEstimate | null;
}) {
  const rangeLabel = formatStatsRangeLabel(range);
  const rewatchLine = rewatchSummary(overview);

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-2xl text-2xl leading-tight font-medium tracking-tight text-balance sm:text-3xl">
        {range.kind === "all" ? "Your viewing history." : `What you watched in ${rangeLabel}.`}
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <StatNumber
          value={overview.uniqueMoviesWatched}
          label={overview.uniqueMoviesWatched === 1 ? "Movie" : "Movies"}
        />
        <StatNumber
          value={overview.uniqueShowsWatched}
          label={overview.uniqueShowsWatched === 1 ? "Show" : "Shows"}
        />
        <StatNumber
          value={overview.uniqueEpisodesWatched}
          label={overview.uniqueEpisodesWatched === 1 ? "Episode" : "Episodes"}
        />
      </div>
      {rewatchLine || estimatedViewingTime ? (
        <p className="text-sm text-muted-foreground">
          {[rewatchLine, estimatedViewingTime ? formatEstimatedHours(estimatedViewingTime) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
