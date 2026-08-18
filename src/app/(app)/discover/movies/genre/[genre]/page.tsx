import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shell/back-button";
import { PageContainer } from "@/components/shell/page-container";
import { normalizeDiscoverPage, normalizeDiscoverSort } from "@/features/discover/discover-params";
import { GenrePagination } from "@/features/discover/genre-pagination";
import { GenreResultsGrid } from "@/features/discover/genre-results-grid";
import { findGenreBySlug } from "@/features/discover/genre-selection";
import { GenreSortSelect } from "@/features/discover/genre-sort-select";
import { getPersonalStates } from "@/server/media/personal-state";
import { discoverMoviesByGenre, getMovieGenres } from "@/server/tmdb/queries";

// A real, deliberate catalog-browsing experience — the destination
// Discover's genre rows' "View all" leads to. See docs/architecture.md.
export default async function MovieGenrePage({
  params,
  searchParams,
}: PageProps<"/discover/movies/genre/[genre]">) {
  const { genre: slug } = await params;
  const search = await searchParams;

  const allGenres = await getMovieGenres();
  const genre = findGenreBySlug(allGenres, slug);
  if (!genre) {
    notFound();
  }

  const sort = normalizeDiscoverSort(search.sort);
  const page = normalizeDiscoverPage(search.page);
  const result = await discoverMoviesByGenre(genre.id, { sort, page });
  // One batched, page-bounded private lookup — never a query per tile
  // (see docs/search.md, "Personal state on public surfaces").
  const personalStates = await getPersonalStates(
    result.items.map((item) => ({ mediaType: item.mediaType, mediaProviderId: item.id })),
  );

  const basePath = `/discover/movies/genre/${slug}`;

  return (
    <PageContainer>
      <BackButton />
      <div className="mt-2 mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {genre.name} Movies
        </h1>
        <GenreSortSelect basePath={basePath} sort={sort} />
      </div>

      <GenreResultsGrid
        items={result.items}
        emptyLabel={`${genre.name.toLowerCase()} movies`}
        personalStates={personalStates}
      />

      <GenrePagination
        basePath={basePath}
        sort={sort}
        page={result.page}
        totalPages={result.totalPages}
      />
    </PageContainer>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/discover/movies/genre/[genre]">): Promise<Metadata> {
  const { genre: slug } = await params;
  const allGenres = await getMovieGenres();
  const genre = findGenreBySlug(allGenres, slug);
  return genre ? { title: `${genre.name} Movies` } : {};
}
