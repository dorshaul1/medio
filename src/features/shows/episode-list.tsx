import { hasReleased } from "@/features/media/has-released";
import { EpisodeRow } from "@/features/shows/episode-row";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";
import type { Episode } from "@/server/media/types";
import type { EpisodeWatchSummary } from "@/server/tracking/types";

// The season page's core content. A plain divided list — hairline
// separators between rows, not a bordered card per episode — keeps a
// long season (20+ episodes) pleasant to scan instead of a stack of
// boxes with repeated visual weight (see docs/architecture.md).
// `summaries` is one bulk-fetched map (see
// getSeasonEpisodeWatchSummaries), never a per-episode query.
export function EpisodeList({
  showProviderId,
  episodes,
  summaries,
  spoilerProtection,
}: {
  showProviderId: number;
  episodes: readonly Episode[];
  summaries: ReadonlyMap<number, EpisodeWatchSummary>;
  spoilerProtection: SpoilerProtectionValue;
}) {
  if (episodes.length === 0) {
    return <p className="text-sm text-muted-foreground">No episodes found for this season.</p>;
  }

  const nextEpisodeNumber = findNextEpisodeNumber(episodes, summaries);

  return (
    <ol className="flex flex-col divide-y divide-border">
      {episodes.map((episode) => (
        <EpisodeRow
          key={episode.id}
          showProviderId={showProviderId}
          episode={episode}
          summary={summaries.get(episode.episodeNumber)}
          isNext={episode.episodeNumber === nextEpisodeNumber}
          spoilerProtection={spoilerProtection}
        />
      ))}
    </ol>
  );
}

// The first aired-but-unwatched episode, in the season's own natural
// order — a restrained, purely local "you are here" signal for
// `EpisodeRow`'s accent border (see docs/tracking.md, "Next episode
// emphasis"). Deliberately scoped to just this season's already-fetched
// episodes/summaries, not a second query: if the true next episode is in
// a different season, this page simply shows no highlight, which is the
// honest answer for what's actually visible here.
function findNextEpisodeNumber(
  episodes: readonly Episode[],
  summaries: ReadonlyMap<number, EpisodeWatchSummary>,
): number | null {
  const next = episodes.find(
    (episode) => hasReleased(episode.airDate) && !summaries.get(episode.episodeNumber)?.hasWatched,
  );
  return next?.episodeNumber ?? null;
}
