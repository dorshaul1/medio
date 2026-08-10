import { MediaCollectionRow } from "@/features/media/media-collection-row";
import {
  getNowPlayingMovies,
  getPopularMovies,
  getPopularShows,
  getTrendingMovies,
  getTrendingShows,
} from "@/server/tmdb/queries";

// Each section is its own small Server Component — an independent
// Suspense boundary per section (see the page), and an independent
// failure boundary: one section failing quietly omits itself instead of
// taking the rest of Home down. Movies and shows stay in separate
// sections everywhere (never one mixed row) so it's always obvious what
// type of media a row is showing.

function CollectionError({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">Couldn&apos;t load {label} right now.</p>;
}

// The lead section — rendered larger to establish rhythm (see
// docs/architecture.md, "Home information architecture") rather than
// every row on the page being visually identical.
export async function TrendingMoviesCollection() {
  try {
    const items = await getTrendingMovies();
    return (
      <MediaCollectionRow
        id="home-trending-movies"
        title="Trending movies"
        items={items}
        size="large"
        priority
      />
    );
  } catch {
    return <CollectionError label="trending movies" />;
  }
}

export async function TrendingShowsCollection() {
  try {
    const items = await getTrendingShows();
    return <MediaCollectionRow id="home-trending-shows" title="Trending shows" items={items} />;
  } catch {
    return <CollectionError label="trending shows" />;
  }
}

export async function InTheatersCollection() {
  try {
    const items = await getNowPlayingMovies();
    return <MediaCollectionRow id="home-in-theaters" title="In theaters" items={items} />;
  } catch {
    return <CollectionError label="in-theaters movies" />;
  }
}

export async function PopularMoviesCollection() {
  try {
    const items = await getPopularMovies();
    return <MediaCollectionRow id="home-popular-movies" title="Popular movies" items={items} />;
  } catch {
    return <CollectionError label="popular movies" />;
  }
}

export async function PopularShowsCollection() {
  try {
    const items = await getPopularShows();
    return <MediaCollectionRow id="home-popular-shows" title="Popular shows" items={items} />;
  } catch {
    return <CollectionError label="popular shows" />;
  }
}
