import { MediaCollectionRow } from "@/features/media/media-collection-row";
import { getShowRecommendations } from "@/server/tmdb/queries";

// The page's one related-content section — recommendations, not both
// recommendations and similar (see docs/media-provider.md). Its own
// Suspense boundary and failure boundary (see the page): genuinely
// secondary, and — unlike on Movie Details — never competes with Seasons
// for attention, since it renders below them.
export async function ShowRecommendations({ showId }: { showId: number }) {
  try {
    const items = await getShowRecommendations(showId);
    return <MediaCollectionRow id="show-recommendations" title="More like this" items={items} />;
  } catch {
    return (
      <p className="text-sm text-muted-foreground">Couldn&apos;t load related shows right now.</p>
    );
  }
}
