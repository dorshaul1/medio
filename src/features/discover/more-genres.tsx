import Link from "next/link";
import type { DiscoverMediaType } from "@/features/discover/discover-params";
import {
  CURATED_MOVIE_GENRES,
  CURATED_SHOW_GENRES,
  genreSlug,
} from "@/features/discover/genre-selection";
import { getMovieGenres, getShowGenres } from "@/server/tmdb/queries";

// The curated 6 rows above are a deliberate featured subset (see
// genre-selection.ts) — this is the escape hatch to the rest of TMDB's
// real genre list, since without it a genre the user actually wants
// (e.g. Documentary, Horror, Romance) would simply be unreachable from
// Discover. Plain compact text links, not a second row of visual tiles —
// see the product spec, "Genre Exploration: a more deliberate genre-
// navigation experience... limited initially with `View all genres`".
export async function MoreGenres({ mediaType }: { mediaType: DiscoverMediaType }) {
  try {
    const curated = mediaType === "movies" ? CURATED_MOVIE_GENRES : CURATED_SHOW_GENRES;
    const all = mediaType === "movies" ? await getMovieGenres() : await getShowGenres();
    const remaining = all.filter((genre) => !curated.includes(genre.name));

    if (remaining.length === 0) return null;

    const basePath = mediaType === "movies" ? "/discover/movies/genre" : "/discover/shows/genre";

    return (
      <section aria-labelledby="discover-more-genres" className="flex flex-col gap-3">
        <h2 id="discover-more-genres" className="text-lg font-medium tracking-tight">
          More genres
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {remaining.map((genre) => (
            <Link
              key={genre.id}
              href={`${basePath}/${genreSlug(genre.name)}`}
              className="rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {genre.name}
            </Link>
          ))}
        </div>
      </section>
    );
  } catch {
    return null;
  }
}
