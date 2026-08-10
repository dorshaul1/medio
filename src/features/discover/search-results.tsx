import { RetryButton } from "@/features/discover/retry-button";
import { SearchResultRow } from "@/features/discover/search-result-row";
import type { MediaSummary } from "@/server/media/types";
import { searchMovies, searchShows } from "@/server/tmdb/queries";

// One page of TMDB results (up to 20) per type is already more than a
// simple list should show at once — this is exploratory search, not a
// paginated catalog (no pagination UI exists this phase).
const MAX_RESULTS_PER_TYPE = 10;

export async function SearchResults({ query }: { query: string }) {
  const [movieResults, showResults] = await Promise.allSettled([
    searchMovies(query),
    searchShows(query),
  ]);

  // Independent per type: a failure searching TV shows shouldn't hide
  // movie results that did load, and vice versa.
  if (movieResults.status === "rejected" && showResults.status === "rejected") {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <p className="text-sm text-muted-foreground">
          Something went wrong loading search results.
        </p>
        <RetryButton />
      </div>
    );
  }

  const movies: readonly MediaSummary[] =
    movieResults.status === "fulfilled"
      ? movieResults.value.items.slice(0, MAX_RESULTS_PER_TYPE)
      : [];
  const shows: readonly MediaSummary[] =
    showResults.status === "fulfilled"
      ? showResults.value.items.slice(0, MAX_RESULTS_PER_TYPE)
      : [];

  if (movies.length === 0 && shows.length === 0) {
    return (
      <p className="py-10 text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;.</p>
    );
  }

  return (
    // A deliberate max-width, not full-bleed — search is a compact
    // scanning list, and letting it stretch across a wide desktop
    // viewport just leaves it looking accidentally small in a sea of
    // empty space rather than intentionally compact.
    <div className="flex max-w-2xl flex-col gap-8">
      {movies.length > 0 ? (
        <section aria-labelledby="search-results-movies" className="flex flex-col gap-1">
          <h2 id="search-results-movies" className="mb-1 text-sm font-medium text-muted-foreground">
            Movies
          </h2>
          <div className="flex flex-col">
            {movies.map((movie) => (
              <SearchResultRow key={movie.id} media={movie} />
            ))}
          </div>
        </section>
      ) : null}

      {shows.length > 0 ? (
        <section aria-labelledby="search-results-shows" className="flex flex-col gap-1">
          <h2 id="search-results-shows" className="mb-1 text-sm font-medium text-muted-foreground">
            TV Shows
          </h2>
          <div className="flex flex-col">
            {shows.map((show) => (
              <SearchResultRow key={show.id} media={show} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
