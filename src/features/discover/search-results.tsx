import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RetryButton } from "@/features/discover/retry-button";
import { SearchResultTypeFilter } from "@/features/discover/search-result-type-filter";
import { UnifiedSearchResultRow } from "@/features/discover/unified-search-result-row";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import { searchAll } from "@/server/search/compose";
import {
  type SearchResultTypeFilter as ResultTypeFilterValue,
  SEARCH_RESULTS_INITIAL_LIMIT,
  SEARCH_RESULTS_MAX_LIMIT,
} from "@/server/search/constants";

// Unified Search's full results — one continuous cross-type ranked list
// (see docs/search.md, "Unified search ranking"), never grouped
// into separate Movie/Show/People sections. Powers both `/discover?q=`
// and "See all results" from the compact GlobalSearch overlay — one
// search results system, not two. The optional type filter (default
// "All") narrows an already-coherent ranking; it's never the initial
// architecture.
export async function SearchResults({
  query,
  expanded = false,
  resultType = "all",
}: {
  query: string;
  expanded?: boolean;
  resultType?: ResultTypeFilterValue;
}) {
  const limit = expanded ? SEARCH_RESULTS_MAX_LIMIT : SEARCH_RESULTS_INITIAL_LIMIT;
  const [unified, { defaultSaveIntent }] = await Promise.all([
    searchAll(query, limit, resultType),
    getCurrentUserPreferences(),
  ]);

  const { results, hasMore, failedTypes } = unified;
  const nothingLoaded = resultType === "all" && failedTypes.length === 3;

  if (nothingLoaded) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <p className="text-sm text-muted-foreground">
          Something went wrong loading search results.
        </p>
        <RetryButton />
      </div>
    );
  }

  const showMoreHref = `/discover?q=${encodeURIComponent(query)}&expanded=1${
    resultType !== "all" ? `&resultType=${resultType}` : ""
  }` as Route;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <SearchResultTypeFilter query={query} active={resultType} />

      {results.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">
          No Movies, Shows or People found for &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="flex flex-col">
          {results.map((result) => (
            <UnifiedSearchResultRow
              key={
                result.kind === "person"
                  ? `person:${result.person.id}`
                  : `${result.kind}:${result.media.id}`
              }
              result={result}
              defaultSaveIntent={defaultSaveIntent}
            />
          ))}
        </div>
      )}

      {failedTypes.length > 0 && failedTypes.length < 3 ? (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load {failedTypes.join(" or ")} results right now.
        </p>
      ) : null}

      {hasMore ? (
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href={showMoreHref}>Show more results</Link>
        </Button>
      ) : null}
    </div>
  );
}
