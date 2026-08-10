import { formatDate } from "@/features/media/format-date";
import { formatRuntime } from "@/features/media/format-runtime";
import { hasReleased } from "@/features/media/has-released";
import { EpisodeSpoilerContent } from "@/features/shows/episode-spoiler-content";
import { EpisodeWatchControl } from "@/features/shows/episode-watch-control";
import { cn } from "@/lib/utils";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";
import type { Episode } from "@/server/media/types";
import { resolveEpisodeSpoilerDecision } from "@/server/spoilers/policy";
import { stillUrl } from "@/server/tmdb/images";
import type { EpisodeWatchSummary } from "@/server/tracking/types";

const UNWATCHED_SUMMARY: EpisodeWatchSummary = {
  hasWatched: false,
  watchCount: 0,
  lastWatchedAt: null,
};

// Still an information row first — still + identity + metadata +
// overview, no per-row card/border, so a long season stays pleasant to
// scan (see docs/architecture.md). The episode number is its own quiet
// typographic column (large, light, tabular figures) rather than baked
// into the title text — the title reads as a title, the number reads as
// a number, and together they scan faster than "4. Title" concatenated
// into one string. A single compact tracking control sits at the
// trailing edge, never a checkbox column (see docs/tracking.md).
//
// Still/title/overview rendering itself lives in `EpisodeSpoilerContent`
// — the one place this row's Spoiler protection decision
// (`resolveEpisodeSpoilerDecision`) actually takes effect.
export function EpisodeRow({
  showProviderId,
  episode,
  summary = UNWATCHED_SUMMARY,
  isNext = false,
  spoilerProtection,
}: {
  showProviderId: number;
  episode: Episode;
  summary?: EpisodeWatchSummary | undefined;
  // Whether this is the season's next unwatched aired episode — earns a
  // quiet rounded Clay-tinted background (a genuinely singular "you are
  // here" marker, not a recurring per-row treatment) rather than a
  // banner or a border line (see docs/tracking.md, "Next episode
  // emphasis").
  isNext?: boolean;
  spoilerProtection: SpoilerProtectionValue;
}) {
  const meta = [
    episode.airDate ? formatDate(episode.airDate) : null,
    episode.runtimeMinutes ? formatRuntime(episode.runtimeMinutes) : null,
  ].filter((part): part is string => part !== null);
  const decision = resolveEpisodeSpoilerDecision({
    protection: spoilerProtection,
    watched: summary.hasWatched,
  });

  return (
    <li
      id={`episode-${episode.episodeNumber}`}
      // Real fragment navigation (see docs/home.md, "Up Next navigation")
      // — Up Next links here directly via `#episode-N` rather than any
      // client-side scroll state. `scroll-mt` keeps the row clear of the
      // season identity block above when the browser jumps to it.
      className={cn(
        "flex scroll-mt-6 items-start gap-3 py-4 sm:items-center sm:gap-4",
        "[[data-density=compact]_&]:py-2.5",
        isNext && "-mx-3 rounded-lg bg-primary/[0.06] px-3 dark:bg-primary/[0.1]",
      )}
    >
      <span
        aria-hidden="true"
        className="w-5 shrink-0 pt-1 text-right text-sm font-light tabular-nums text-muted-foreground/60 sm:w-7 sm:pt-0 sm:text-base"
      >
        {episode.episodeNumber}
      </span>

      <EpisodeSpoilerContent
        episodeNumber={episode.episodeNumber}
        title={episode.title}
        overview={episode.overview}
        stillUrl={stillUrl(episode.still)}
        meta={meta}
        decision={decision}
        watched={summary.hasWatched}
        isNext={isNext}
      />

      <div className="flex shrink-0 items-center self-center">
        {hasReleased(episode.airDate) ? (
          <EpisodeWatchControl
            showProviderId={showProviderId}
            seasonNumber={episode.seasonNumber}
            episodeNumber={episode.episodeNumber}
            episodeProviderId={episode.id}
            summary={summary}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Upcoming</span>
        )}
      </div>
    </li>
  );
}
