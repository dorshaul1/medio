import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { LibraryEmptyState } from "@/features/library/library-empty-state";
import { LibraryItemRow } from "@/features/library/library-item-row";
import {
  isRawStateValidForMediaType,
  MOVIE_STATE_OPTIONS,
  normalizeLibraryCount,
  normalizeLibraryMediaType,
  normalizeLibrarySort,
  normalizeLibraryState,
  SHOW_STATE_OPTIONS,
} from "@/features/library/library-params";
import { LibrarySectionNav } from "@/features/library/library-section-nav";
import { LibrarySelect } from "@/features/library/library-select";
import { LibraryTypeToggle } from "@/features/library/library-type-toggle";
import type { LibraryRawState, LibrarySort } from "@/server/library/candidates";
import { LIBRARY_PAGE_SIZE } from "@/server/library/constants";
import { getLibraryPage } from "@/server/library/queries";
import type { MediaType } from "@/server/media/types";

export const metadata: Metadata = {
  title: "Library",
};

// Answers "what am I watching, planning, pausing, or finished with?" —
// not another Discover catalog (see docs/library.md). Server-first: type/
// state/sort/pagination all live in the URL, not React state, so back/
// forward/refresh work naturally and this stays a real link-driven page,
// not a client-rendered dashboard.
export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const params = await searchParams;
  const mediaType = normalizeLibraryMediaType(params.type);
  const rawState = normalizeLibraryState(params.state);
  const state =
    rawState && mediaType && !isRawStateValidForMediaType(rawState, mediaType)
      ? undefined
      : rawState;
  const sort = normalizeLibrarySort(params.sort);
  const count = normalizeLibraryCount(params.count);

  const { items, hasMore } = await getLibraryPage({ mediaType, state, sort, count });

  const isFiltered = mediaType !== undefined || state !== undefined;
  const stateOptions = mediaType === "movie" ? MOVIE_STATE_OPTIONS : SHOW_STATE_OPTIONS;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <LibrarySectionNav active="library" />
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Library</h1>
        </div>

        <div className="flex flex-col gap-4">
          <LibraryTypeToggle
            active={mediaType ?? "all"}
            state={state}
            sort={params.sort as string | undefined}
          />

          <div className="flex flex-wrap items-center gap-3">
            {mediaType ? (
              <LibrarySelect
                label="State"
                value={state ?? "all"}
                options={[{ value: "all", label: "All states" }, ...stateOptions].map((option) => ({
                  ...option,
                  href: buildHref(
                    { mediaType, sort },
                    {
                      state: option.value === "all" ? undefined : (option.value as LibraryRawState),
                    },
                  ),
                }))}
              />
            ) : null}
            <LibrarySelect
              label="Sort"
              value={sort}
              options={[
                { value: "recently_active", label: "Recently active" },
                { value: "recently_added", label: "Recently added" },
              ].map((option) => ({
                ...option,
                href: buildHref({ mediaType, state, sort }, { sort: option.value as LibrarySort }),
              }))}
            />
          </div>
        </div>

        {items.length === 0 ? (
          isFiltered ? (
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
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col divide-y divide-border">
              {items.map((item) => (
                <LibraryItemRow key={`${item.mediaType}:${item.mediaProviderId}`} item={item} />
              ))}
            </ul>
            {hasMore ? (
              <Button asChild variant="outline" size="sm" className="self-start">
                <Link
                  href={buildHref({ mediaType, state, sort }, { count: count + LIBRARY_PAGE_SIZE })}
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
    sort: LibrarySort;
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
  if (overrides.count) params.set("count", String(overrides.count));
  const query = params.toString();
  return (query ? `/library?${query}` : "/library") as Route;
}
