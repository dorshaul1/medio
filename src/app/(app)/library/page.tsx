import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { LibraryEmptyState, LibrarySearchEmptyState } from "@/features/library/library-empty-state";
import { LibraryItemRow } from "@/features/library/library-item-row";
import {
  ALL_MEDIA_STATE_OPTIONS,
  isRawStateValidForAllMediaTypes,
  isRawStateValidForMediaType,
  MOVIE_STATE_OPTIONS,
  normalizeLibraryCount,
  normalizeLibraryMediaType,
  normalizeLibraryQuery,
  normalizeLibrarySort,
  normalizeLibraryState,
  SHOW_STATE_OPTIONS,
} from "@/features/library/library-params";
import { LibrarySearch } from "@/features/library/library-search";
import { LibrarySectionHeading } from "@/features/library/library-section-heading";
import { LibrarySectionNav } from "@/features/library/library-section-nav";
import { LibrarySelect } from "@/features/library/library-select";
import { LibraryTypeToggle } from "@/features/library/library-type-toggle";
import { SwipeHintProvider } from "@/features/library/swipe-hint-context";
import type { LibraryRawState, LibrarySort } from "@/server/library/candidates";
import { LIBRARY_PAGE_SIZE } from "@/server/library/constants";
import { getLibraryPage } from "@/server/library/queries";
import { groupLibraryItems } from "@/server/library/types";
import type { MediaType } from "@/server/media/types";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

export const metadata: Metadata = {
  title: "Library",
};

// Answers "what am I watching, planning, pausing, or finished with?" —
// not another Discover catalog (see docs/library.md). Server-first: type/
// state/sort/search/pagination all live in the URL, not React state, so
// back/forward/refresh work naturally and this stays a real link-driven
// page, not a client-rendered dashboard.
export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const params = await searchParams;
  const mediaType = normalizeLibraryMediaType(params.type);
  const rawState = normalizeLibraryState(params.state);
  const isStateValid = rawState
    ? mediaType
      ? isRawStateValidForMediaType(rawState, mediaType)
      : isRawStateValidForAllMediaTypes(rawState)
    : true;
  const state = isStateValid ? rawState : undefined;
  const sort = normalizeLibrarySort(params.sort);
  const count = normalizeLibraryCount(params.count);
  const query = normalizeLibraryQuery(params.q);

  const preferences = await getCurrentUserPreferences();

  const { items, hasMore, scanWasCapped } = await getLibraryPage({
    mediaType,
    state,
    sort,
    count,
    query,
  });

  const isFiltered = mediaType !== undefined || state !== undefined;
  const stateOptions =
    mediaType === "movie"
      ? MOVIE_STATE_OPTIONS
      : mediaType === "show"
        ? SHOW_STATE_OPTIONS
        : ALL_MEDIA_STATE_OPTIONS;

  // The default "no explicit state" view clusters this page's items into
  // the Library's In progress → Planned → Paused → Finished hierarchy
  // (see docs/library.md, "Default grouping") rather than one flat,
  // purely-chronological list. Once a specific state is chosen, or a
  // search is active, every visible item already shares that one state/
  // matches the query — a second grouping pass would just repeat a
  // single redundant heading, so it's skipped.
  const groups = !state && !query ? groupLibraryItems(items) : null;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <LibrarySectionNav active="library" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Library
            </h1>
            <LibrarySearch initialQuery={query ?? ""} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <LibraryTypeToggle active={mediaType ?? "all"} state={state} sort={sort} query={query} />

          <div className="flex flex-wrap items-center gap-3">
            <LibrarySelect
              label="State"
              value={state ?? "all"}
              options={[{ value: "all", label: "All states" }, ...stateOptions].map((option) => ({
                ...option,
                href: buildHref(
                  { mediaType, sort, query },
                  { state: option.value === "all" ? undefined : (option.value as LibraryRawState) },
                ),
              }))}
            />
            {!query ? (
              <LibrarySelect
                label="Sort"
                value={sort}
                options={[
                  { value: "recently_active", label: "Recently active" },
                  { value: "recently_added", label: "Recently added" },
                ].map((option) => ({
                  ...option,
                  href: buildHref(
                    { mediaType, state, query },
                    { sort: option.value as LibrarySort },
                  ),
                }))}
              />
            ) : null}
          </div>
        </div>

        {items.length === 0 ? (
          query ? (
            <LibrarySearchEmptyState query={query} />
          ) : isFiltered ? (
            <LibraryEmptyState
              heading="Nothing here yet."
              description="No media matches this filter."
            />
          ) : (
            <LibraryEmptyState
              heading="Nothing here yet."
              description="Save or start tracking something to see it here."
              showDiscoverLink
            />
          )
        ) : (
          <div className="flex flex-col gap-6">
            <SwipeHintProvider>
              {groups ? (
                groups.map((entry) => (
                  <div key={entry.group} className="flex flex-col gap-2">
                    <LibrarySectionHeading group={entry.group} />
                    <ul className="flex flex-col divide-y divide-border">
                      {entry.items.map((item) => (
                        <LibraryItemRow
                          key={`${item.mediaType}:${item.mediaProviderId}`}
                          item={item}
                          mobileEpisodeControls={preferences.mobileEpisodeControls}
                          hasSeenSwipeHint={preferences.hasSeenSwipeHint}
                        />
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {items.map((item) => (
                    <LibraryItemRow
                      key={`${item.mediaType}:${item.mediaProviderId}`}
                      item={item}
                      mobileEpisodeControls={preferences.mobileEpisodeControls}
                      hasSeenSwipeHint={preferences.hasSeenSwipeHint}
                    />
                  ))}
                </ul>
              )}
            </SwipeHintProvider>

            {query && scanWasCapped ? (
              <p className="text-xs text-muted-foreground">
                Showing results from your most recently active titles.
              </p>
            ) : null}

            {hasMore ? (
              <Button asChild variant="outline" size="sm" className="self-start">
                <Link
                  href={buildHref(
                    { mediaType, state, sort, query },
                    { count: count + LIBRARY_PAGE_SIZE },
                  )}
                >
                  Load more
                </Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function buildHref(
  current: {
    mediaType?: MediaType | undefined;
    state?: LibraryRawState | undefined;
    sort?: LibrarySort | undefined;
    query?: string | undefined;
  },
  overrides: Partial<{
    mediaType: MediaType | undefined;
    state: LibraryRawState | undefined;
    sort: LibrarySort;
    count: number;
  }>,
): Route {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();
  if (next.mediaType) params.set("type", next.mediaType);
  if (next.state) params.set("state", next.state);
  if (next.sort === "recently_added") params.set("sort", "added");
  if (next.query) params.set("q", next.query);
  if (overrides.count) params.set("count", String(overrides.count));
  const search = params.toString();
  return (search ? `/library?${search}` : "/library") as Route;
}
