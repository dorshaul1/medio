import { Skeleton } from "@/components/ui/skeleton";
import { episodeCoordinateLabel } from "@/features/calendar/event-copy";
import { hasReleased } from "@/features/media/has-released";
import { MediaOpinionSection } from "@/features/media/media-opinion-section";
import { PlanningControl } from "@/features/media/planning-control";
import { TrailerButton } from "@/features/media/trailer-button";
import { MarkShowWatchedControl } from "@/features/shows/mark-show-watched-control";
import { ShowTrackingControl } from "@/features/shows/show-tracking-control";
import { getShowTrackingView } from "@/features/shows/show-tracking-view";
import { formatReleaseDate } from "@/server/calendar/date";
import type { Episode, SeasonSummary, Trailer } from "@/server/media/types";
import { getMediaOpinion } from "@/server/opinions/queries";
import { getPlanningState } from "@/server/planning/planning-items";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

// The Suspense fallback for ShowTrackingSection below — approximates the
// control's shape (a status label + a compact progress readout) so the
// hero doesn't jump once the real section arrives.
export function ShowTrackingSectionSkeleton() {
  return <Skeleton className="h-9 w-40" />;
}

// Fetches the tracking view (see show-tracking-view.ts — the one section
// that fetches every regular season's episodes, deliberately deferred
// behind its own Suspense boundary on the page so it never blocks the
// rest of Show Details) and renders the interactive control. `trailer`
// is rendered as part of this same top button row — not a sibling of
// this whole section back up in ShowHero — so it stays aligned with the
// status row exactly like Movie Details, in both the "not started" and
// "watching" states, instead of vertically centering against this
// section's full height once the opinion row below adds height (see
// docs/tracking.md).
export async function ShowTrackingSection({
  showProviderId,
  title,
  seasons,
  showStatus,
  nextEpisodeToAir,
  trailer,
}: {
  showProviderId: number;
  title: string;
  seasons: readonly SeasonSummary[];
  showStatus: string;
  nextEpisodeToAir: Episode | null;
  trailer: Trailer | null;
}) {
  const [view, planningState, opinion, preferences] = await Promise.all([
    getShowTrackingView({ showProviderId, seasons, showStatus, nextEpisodeToAir }),
    getPlanningState("show", showProviderId),
    getMediaOpinion({ mediaType: "show", mediaProviderId: showProviderId }),
    getCurrentUserPreferences(),
  ]);

  const explicitState = view.explicitState?.status ?? null;
  const notStarted = explicitState === null && view.progress.derivedViewingState === "unwatched";
  // Rating/Reactions/Notes become available once the user has watched at
  // least one regular (non-Special) episode — not full completion, and
  // not gated by explicit tracking state, since someone can form a real
  // opinion a few episodes in (see docs/opinions.md, "Show rating
  // eligibility"). `uniqueWatchedAiredEpisodeCount` already excludes
  // Specials and rewatches, same rule used everywhere else in this app.
  const hasWatchedAnEpisode = view.progress.uniqueWatchedAiredEpisodeCount > 0;

  const airedEpisodes = view.episodes
    .filter((episode) => hasReleased(episode.airDate))
    .map((episode) => ({
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      episodeProviderId: episode.id,
    }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ShowTrackingControl
          showProviderId={showProviderId}
          explicitState={explicitState}
          progress={view.progress}
        />
        {/* Planning only makes sense before the show is actually tracked
            — once tracking exists (even just "Watching" with no
            episodes yet), the relationship is Tracking's, not
            Planning's; see docs/library.md, "Planning controls". */}
        {notStarted ? (
          <PlanningControl
            mediaType="show"
            mediaProviderId={showProviderId}
            intent={planningState?.intent ?? null}
            title={title}
            defaultIntent={preferences.defaultSaveIntent}
          />
        ) : null}
        {!notStarted ? (
          <MarkShowWatchedControl
            showProviderId={showProviderId}
            episodes={airedEpisodes}
            remainingCount={view.progress.remainingAiredEpisodeCount}
          />
        ) : null}
        {trailer ? <TrailerButton trailer={trailer} title={title} /> : null}
      </div>

      {/* Same release-date semantics/formatting Calendar itself uses
          (see docs/calendar.md) — never a separate calculation. Dates
          are never spoiler-gated (see EpisodeRow's own meta line), so
          this shows regardless of Spoiler protection. Deliberately
          plain "Aug 17" rather than Calendar's "Today"/"Tomorrow"
          framing: that distinction needs a client mount step this one
          small context line doesn't warrant on its own. */}
      {nextEpisodeToAir?.airDate ? (
        <p className="text-xs text-muted-foreground">
          {episodeCoordinateLabel({
            seasonNumber: nextEpisodeToAir.seasonNumber,
            episodeNumber: nextEpisodeToAir.episodeNumber,
            isSeasonPremiere: nextEpisodeToAir.episodeNumber === 1,
            isShowPremiere:
              nextEpisodeToAir.seasonNumber === 1 && nextEpisodeToAir.episodeNumber === 1,
          })}{" "}
          · {formatReleaseDate(nextEpisodeToAir.airDate, new Date(), false)}
        </p>
      ) : null}

      {hasWatchedAnEpisode ? (
        <MediaOpinionSection
          mediaType="show"
          mediaProviderId={showProviderId}
          title={title}
          opinion={opinion}
        />
      ) : null}
    </div>
  );
}
