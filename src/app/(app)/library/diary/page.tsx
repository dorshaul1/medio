import type { Metadata, Route } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { DiaryFilterToggle } from "@/features/diary/diary-filter-toggle";
import { normalizeDiaryFilter, normalizeDiarySort } from "@/features/diary/diary-params";
import { DiaryTimeline } from "@/features/diary/diary-timeline";
import { LibraryEmptyState } from "@/features/library/library-empty-state";
import { LibrarySectionNav } from "@/features/library/library-section-nav";
import { LibrarySelect } from "@/features/library/library-select";
import { getDiaryPage } from "@/server/diary/queries";
import type { DiaryFilter, DiarySort } from "@/server/diary/types";

export const metadata: Metadata = {
  title: "Diary",
};

// Answers "what have I been watching?" — a chronological personal
// timeline, not a media-analytics dashboard (see docs/diary.md). Server-
// first, same as `/library` itself: filter/sort live in the URL, the
// first page is fetched and hydrated on the server, and only pagination/
// local-timezone date grouping need the browser at all (see
// `DiaryTimeline`).
export default async function DiaryPage({ searchParams }: PageProps<"/library/diary">) {
  const params = await searchParams;
  const filter = normalizeDiaryFilter(params.type);
  const sort = normalizeDiarySort(params.sort);

  const { entries, nextCursor, hasMore } = await getDiaryPage({ filter, sort, cursor: null });

  const isFiltered = filter !== "all";

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <LibrarySectionNav active="diary" />
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Diary</h1>
        </div>

        <div className="flex flex-col gap-4">
          <DiaryFilterToggle active={filter} sort={params.sort as string | undefined} />

          <div className="flex flex-wrap items-center gap-3">
            <LibrarySelect
              label="Sort"
              value={sort}
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
              ].map((option) => ({
                ...option,
                href: buildHref({ filter }, { sort: option.value as DiarySort }),
              }))}
            />
          </div>
        </div>

        {entries.length === 0 ? (
          isFiltered ? (
            <LibraryEmptyState
              heading="Nothing here yet."
              description="No history matches this filter."
            />
          ) : (
            <LibraryEmptyState
              heading="Nothing watched yet."
              description="Start tracking a movie or show to see your history here."
              showDiscoverLink
            />
          )
        ) : (
          <DiaryTimeline
            key={`${filter}:${sort}`}
            initialEntries={entries}
            initialCursor={nextCursor}
            initialHasMore={hasMore}
            filter={filter}
            sort={sort}
          />
        )}
      </div>
    </PageContainer>
  );
}

function buildHref(
  current: { filter: DiaryFilter },
  overrides: Partial<{ filter: DiaryFilter; sort: DiarySort }>,
): Route {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();
  if (next.filter !== "all") params.set("type", next.filter);
  if (overrides.sort === "oldest") params.set("sort", "oldest");
  const query = params.toString();
  return (query ? `/library/diary?${query}` : "/library/diary") as Route;
}
