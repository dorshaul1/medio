import Link from "next/link";
import type { DiscoverMediaType } from "@/features/discover/discover-params";
import {
  CURATED_MOVIE_GENRES,
  CURATED_SHOW_GENRES,
  genreSlug,
  selectCuratedGenres,
} from "@/features/discover/genre-selection";
import { MediaCollectionRow } from "@/features/media/media-collection-row";
import type { Genre } from "@/server/media/types";
import {
  discoverMoviesByGenre,
  discoverShowsByGenre,
  getMovieGenres,
  getShowGenres,
} from "@/server/tmdb/queries";
import { getWatchedMovieIds } from "@/server/tracking/movie-events";

// A restrained number per row — this is a browse row, not the dedicated
// genre catalog page (which has real pagination).
const ITEMS_PER_ROW = 12;

function GenreRowError({ genreName }: { genreName: string }) {
  return <p className="text-sm text-muted-foreground">Couldn&apos;t load {genreName} right now.</p>;
}

async function MovieGenreRow({ genre }: { genre: Genre }) {
  try {
    const { items } = await discoverMoviesByGenre(genre.id);
    const visible = items.slice(0, ITEMS_PER_ROW);
    // One batched, bounded-to-this-row private lookup — never a query
    // per poster (see docs/media-provider.md). A failure here shouldn't
    // break browsing, so it degrades to "no watched marks this row"
    // rather than the row itself failing.
    const watchedMovieIds = await getWatchedMovieIds(visible.map((item) => item.id)).catch(
      () => new Set<number>(),
    );
    return (
      <MediaCollectionRow
        id={`genre-movies-${genreSlug(genre.name)}`}
        title={genre.name}
        items={visible}
        watchedMovieIds={watchedMovieIds}
        action={
          <Link
            href={`/discover/movies/genre/${genreSlug(genre.name)}`}
            className="shrink-0 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            View all
          </Link>
        }
      />
    );
  } catch {
    return <GenreRowError genreName={genre.name} />;
  }
}

async function ShowGenreRow({ genre }: { genre: Genre }) {
  try {
    const { items } = await discoverShowsByGenre(genre.id);
    return (
      <MediaCollectionRow
        id={`genre-shows-${genreSlug(genre.name)}`}
        title={genre.name}
        items={items.slice(0, ITEMS_PER_ROW)}
        action={
          <Link
            href={`/discover/shows/genre/${genreSlug(genre.name)}`}
            className="shrink-0 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            View all
          </Link>
        }
      />
    );
  } catch {
    return <GenreRowError genreName={genre.name} />;
  }
}

// The curated genre list itself is one request, not one per genre — each
// genre's *content* row is its own independent async component (called
// directly, not wrapped in its own Suspense — see the page, which streams
// the whole set behind one boundary sized for "browse mode changed").
export async function DiscoverGenreRows({ mediaType }: { mediaType: DiscoverMediaType }) {
  if (mediaType === "movies") {
    const allGenres = await getMovieGenres();
    const genres = selectCuratedGenres(allGenres, CURATED_MOVIE_GENRES);
    return (
      <div className="flex flex-col gap-10">
        {genres.map((genre) => (
          <MovieGenreRow key={genre.id} genre={genre} />
        ))}
      </div>
    );
  }

  const allGenres = await getShowGenres();
  const genres = selectCuratedGenres(allGenres, CURATED_SHOW_GENRES);
  return (
    <div className="flex flex-col gap-10">
      {genres.map((genre) => (
        <ShowGenreRow key={genre.id} genre={genre} />
      ))}
    </div>
  );
}
