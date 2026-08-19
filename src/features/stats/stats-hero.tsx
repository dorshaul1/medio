import type { TasteOverview, ViewingTimeEstimate } from "@/server/stats/types";
import { formatStatsRangeLabel } from "@/server/stats/range";
import type { StatsRange } from "@/server/stats/range";

// Stats' opening area — viewing volume for the selected range (see
// docs/stats.md). Deliberately not a taste headline: personal taste
// insight lives on the Taste tab; Overview is temporal viewing activity.
function formatHours(minutes: number): string {
  const hours = Math.max(1, Math.round(minutes / 60));
  return `~${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function StatNumber({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-4xl font-medium tracking-tight tabular-nums sm:text-5xl">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// A deliberately smaller scale than `StatNumber` — real figures, not a
// secondary footnote, but Time watched is a supporting breakdown of the
// same period the counts above already cover, not a second headline
// competing with it (see CLAUDE.md, "Section visual weight is
// deliberately unequal", applied here at the scale of one hero).
function TimeStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-medium tracking-tight tabular-nums sm:text-3xl">{value}</span>
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

// Movies and Shows are gated independently (see `estimateViewingTime`,
// server/stats/viewing-time.ts) — either can be withheld on its own
// while the combined Total still shows, so this only ever renders the
// breakdown figures actually confident enough to exist; Total always
// renders once `estimate` itself is non-null, since it already cleared
// its own, separate combined coverage bar. Never shown at all below the
// documented runtime-coverage threshold (see docs/stats.md, "Viewing
// time") — no invented precision, no default runtime.
function TimeWatchedSection({ estimate }: { estimate: ViewingTimeEstimate | null }) {
  if (!estimate) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Time watched
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {estimate.movieMinutes !== null ? (
          <TimeStat value={formatHours(estimate.movieMinutes)} label="Movies" />
        ) : null}
        {estimate.showMinutes !== null ? (
          <TimeStat value={formatHours(estimate.showMinutes)} label="Shows" />
        ) : null}
        <TimeStat value={formatHours(estimate.minutes)} label="Total" />
      </div>
    </div>
  );
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
      <p className="font-display max-w-2xl text-2xl leading-tight font-medium tracking-tight text-balance sm:text-3xl">
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
      {rewatchLine ? <p className="text-sm text-muted-foreground">{rewatchLine}</p> : null}
      <TimeWatchedSection estimate={estimatedViewingTime} />
    </div>
  );
}
