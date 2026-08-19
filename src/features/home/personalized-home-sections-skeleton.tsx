import { MediaCollectionRowSkeleton } from "@/features/media/media-collection-row-skeleton";
import { UpNextCardSkeleton } from "@/features/home/up-next-card-skeleton";

// `PersonalizedHomeSections`' one Suspense fallback — mirrors its own
// composition rule so the skeleton never promises a row the real content
// can't possibly show: `showUpNext`/`showContinuationRows` are already
// known synchronously from preferences (see home-page.tsx), so this only
// ever renders shapes for sections that are actually enabled. It can
// still end up collapsing to nothing once `getPersonalHome()` resolves
// (a user with no active shows genuinely has no continuation content —
// see docs/home.md, "No empty personal dashboard") — a brief skeleton
// flash in that case is the accepted tradeoff for never showing a blank
// gap for the far more common case where real content is coming.
export function PersonalizedHomeSectionsSkeleton({
  showUpNext,
  showFinishSoon,
  showContinuationRows,
}: {
  showUpNext: boolean;
  showFinishSoon: boolean;
  showContinuationRows: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      {showUpNext ? <UpNextCardSkeleton /> : null}
      {showContinuationRows ? (
        <>
          {showFinishSoon ? (
            <MediaCollectionRowSkeleton title="Finish Soon" size="compact" radius="md" count={4} />
          ) : null}
          <MediaCollectionRowSkeleton
            title="Continue Watching"
            size="cozy"
            radius="md"
            count={4}
            extraLine
          />
        </>
      ) : null}
    </div>
  );
}
