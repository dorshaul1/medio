import { MediaCollectionRow } from "@/features/media/media-collection-row";
import { getMovieRecommendations } from "@/server/tmdb/queries";

// The page's one related-content section — recommendations, not both
// recommendations and similar (see docs/media-provider.md). Its own
// Suspense boundary and its own failure boundary (see the page): this is
// the least essential part of the page, so it streams in independently
// and never blocks or breaks the rest of the movie's identity content.
export async function MovieRecommendations({ movieId }: { movieId: number }) {
  try {
    const items = await getMovieRecommendations(movieId);
    return <MediaCollectionRow id="movie-recommendations" title="More like this" items={items} />;
  } catch {
    return (
      <p className="text-sm text-muted-foreground">Couldn&apos;t load related movies right now.</p>
    );
  }
}
