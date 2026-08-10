import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { DiscoverGenreRows } from "@/features/discover/discover-genre-rows";
import { normalizeDiscoverMediaType } from "@/features/discover/discover-params";
import { DiscoverSearchInput } from "@/features/discover/discover-search-input";
import { CURATED_MOVIE_GENRES, CURATED_SHOW_GENRES } from "@/features/discover/genre-selection";
import { MediaTypeToggle } from "@/features/discover/media-type-toggle";
import {
  extractSearchQueryParam,
  normalizeSearchQuery,
} from "@/features/discover/normalize-search-query";
import { SearchResults } from "@/features/discover/search-results";
import { SearchResultsSkeleton } from "@/features/discover/search-results-skeleton";
import { MediaCollectionRowSkeleton } from "@/features/media/media-collection-row-skeleton";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

export const metadata: Metadata = {
  title: "Discover",
};

// Answers "help me find something I want to watch" — Search first (both
// media types, always), then intentional Movies/Shows genre browsing.
// Deliberately doesn't duplicate Home's Trending/Popular sections — see
// docs/architecture.md ("Home vs Discover").
export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const params = await searchParams;
  const rawQuery = extractSearchQueryParam(params.q);
  const query = normalizeSearchQuery(params.q);
  const { discoverDefaultType } = await getCurrentUserPreferences();
  const mediaType = normalizeDiscoverMediaType(params.type, discoverDefaultType);
  const genreNames = mediaType === "movies" ? CURATED_MOVIE_GENRES : CURATED_SHOW_GENRES;

  return (
    <PageContainer>
      {/* A custom header, not the shared PageHeader — this page's second
          line of hierarchy is the search field itself, not description
          copy, so it doesn't fit that primitive's title+description shape. */}
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Discover</h1>
        <DiscoverSearchInput initialQuery={rawQuery} />
      </div>

      {query ? (
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchResults query={query} />
        </Suspense>
      ) : (
        <div className="flex flex-col gap-8">
          <MediaTypeToggle active={mediaType} />
          <Suspense
            key={mediaType}
            fallback={
              <div className="flex flex-col gap-10">
                {genreNames.map((name) => (
                  <MediaCollectionRowSkeleton key={name} title={name} />
                ))}
              </div>
            }
          >
            <DiscoverGenreRows mediaType={mediaType} />
          </Suspense>
        </div>
      )}
    </PageContainer>
  );
}
