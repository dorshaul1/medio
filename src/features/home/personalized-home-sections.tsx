import { ContinueWatchingRow } from "@/features/home/continue-watching-row";
import { FinishSoonRow } from "@/features/home/finish-soon-row";
import { UpNextCard } from "@/features/home/up-next-card";
import { getPersonalHome } from "@/server/home/queries";

// The one place personalized Home's private data is fetched — a single
// `getPersonalHome()` call behind a single Suspense boundary (see the
// page), so public/other sections never wait on it and it never waits on
// them. See docs/home.md, "Up Next is a separate preference" and "Home
// layout and composition": Up Next and the rest of personal continuation
// (Finish Soon/Continue Watching) come from the exact same classification
// (`getPersonalHome()` never changes based on either preference — a show
// is always "the" Up Next candidate, or it isn't), but are shown
// independently, composed here from two separate inputs:
//
// - `showUpNext` (the "Show Up Next" preference) controls whether the Up
//   Next card renders at all, in every Home layout.
// - `showContinuationRows` (from `resolveHomeLayout` — true for
//   Balanced/Personal, false for Calendar) controls whether Finish Soon/
//   Continue Watching render below it.
//
// When Up Next is turned off, its show doesn't just vanish from Home: it
// folds into the front of Continue Watching (still excluded from Finish
// Soon, which stays a distinct, smaller bucket) so the layout body
// becomes genuinely "the first Home content", as the preference promises,
// without losing a real personal title. This only matters when
// `showContinuationRows` is true — Calendar's body never shows Continue
// Watching regardless.
//
// Renders nothing at all when there's nothing to show for the given
// combination of preferences (see docs/home.md, "No empty personal
// dashboard") — never an empty card or "start watching something"
// prompt. A private-data fetch failure degrades the same way: personalized
// Home just doesn't render, the rest of Home is unaffected. Its own
// Suspense fallback (`PersonalizedHomeSectionsSkeleton`, see home-page.tsx)
// mirrors this same "nothing to show" possibility — a user with no
// active shows will briefly see the skeleton collapse to nothing once
// this resolves, which is the accepted tradeoff for never showing a
// blank gap for the much more common case where real content is coming.
export async function PersonalizedHomeSections({
  showUpNext,
  showFinishSoon,
  showContinuationRows,
}: {
  showUpNext: boolean;
  showFinishSoon: boolean;
  showContinuationRows: boolean;
}) {
  try {
    const { upNext, finishSoon, continueWatching } = await getPersonalHome();

    const displayUpNext = showUpNext ? upNext : null;
    const displayContinueWatching =
      showUpNext || !upNext ? continueWatching : [upNext, ...continueWatching];

    const hasContinuationContent =
      showContinuationRows && (finishSoon.length > 0 || displayContinueWatching.length > 0);
    if (!displayUpNext && !hasContinuationContent) return null;

    return (
      <div className="flex flex-col gap-8">
        {displayUpNext ? (
          // Keyed by episode identity, not just the show — React remounts
          // the card (rather than diffing it in place) whenever Up Next
          // actually advances to a new episode, which is what lets
          // UpNextCard's own enter transition play (see its comment).
          <UpNextCard
            key={`${displayUpNext.showProviderId}-${displayUpNext.nextEpisode.episodeProviderId}`}
            item={displayUpNext}
          />
        ) : null}
        {showContinuationRows ? (
          <>
            {/* "Show Finish Soon" (see docs/settings.md) — a
                presentation-only preference; the underlying
                classification/data is unaffected. */}
            {showFinishSoon ? <FinishSoonRow items={finishSoon} /> : null}
            <ContinueWatchingRow items={displayContinueWatching} />
          </>
        ) : null}
      </div>
    );
  } catch {
    return null;
  }
}
