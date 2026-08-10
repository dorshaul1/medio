import { ContinueWatchingRow } from "@/features/home/continue-watching-row";
import { FinishSoonRow } from "@/features/home/finish-soon-row";
import { UpNextCard } from "@/features/home/up-next-card";
import { getPersonalHome } from "@/server/home/queries";

// The one place personalized Home's private data is fetched — a single
// `getPersonalHome()` call behind a single Suspense boundary (see the
// page), so public sections never wait on it and it never waits on them.
// Renders nothing at all when the user has no eligible active show
// (see docs/home.md, "No empty personal dashboard") — never an empty
// card or "start watching something" prompt; public Home content simply
// moves up to fill the space. A private-data fetch failure degrades the
// same way: personalized Home just doesn't render, the rest of Home is
// unaffected.
export async function PersonalizedHomeSections({ showFinishSoon }: { showFinishSoon: boolean }) {
  try {
    const { upNext, finishSoon, continueWatching } = await getPersonalHome();
    if (!upNext && finishSoon.length === 0 && continueWatching.length === 0) return null;

    return (
      <div className="flex flex-col gap-8">
        {upNext ? (
          // Keyed by episode identity, not just the show — React remounts
          // the card (rather than diffing it in place) whenever Up Next
          // actually advances to a new episode, which is what lets
          // UpNextCard's own enter transition play (see its comment).
          <UpNextCard
            key={`${upNext.showProviderId}-${upNext.nextEpisode.episodeProviderId}`}
            item={upNext}
          />
        ) : null}
        {/* "Show Finish Soon" (see docs/settings.md) — a presentation-only
            preference; the underlying classification/data is unaffected. */}
        {showFinishSoon ? <FinishSoonRow items={finishSoon} /> : null}
        <ContinueWatchingRow items={continueWatching} />
      </div>
    );
  } catch {
    return null;
  }
}
