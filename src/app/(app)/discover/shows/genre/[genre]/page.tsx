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
import { discoverShowsByGenre, getShowGenres } from "@/server/tmdb/queries";

// See the equivalent comment in
// src/app/(app)/discover/movies/genre/[genre]/page.tsx.
export default async function ShowGenrePage({
  params,
  searchParams,
}: PageProps<"/discover/shows/genre/[genre]">) {
  const { genre: slug } = await params;
  const search = await searchParams;

  const allGenres = await getShowGenres();
  const genre = findGenreBySlug(allGenres, slug);
  if (!genre) {
    notFound();
  }

  const sort = normalizeDiscoverSort(search.sort);
  const page = normalizeDiscoverPage(search.page);
  const result = await discoverShowsByGenre(genre.id, { sort, page });
  const personalStates = await getPersonalStates(
    result.items.map((item) => ({ mediaType: item.mediaType, mediaProviderId: item.id })),
  );

  const basePath = `/discover/shows/genre/${slug}`;

  return (
    <PageContainer>
      <BackButton />
      <div className="mt-2 mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">{genre.name} Shows</h1>
        <GenreSortSelect basePath={basePath} sort={sort} />
      </div>

      <GenreResultsGrid
        items={result.items}
        emptyLabel={`${genre.name.toLowerCase()} shows`}
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
}: PageProps<"/discover/shows/genre/[genre]">): Promise<Metadata> {
  const { genre: slug } = await params;
  const allGenres = await getShowGenres();
  const genre = findGenreBySlug(allGenres, slug);
  return genre ? { title: `${genre.name} Shows` } : {};
}
