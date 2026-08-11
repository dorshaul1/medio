import type { Metadata, Route } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { DiaryFilterToggle } from "@/features/diary/diary-filter-toggle";
import { formatDiaryMonthLabel } from "@/features/diary/diary-month-format";
import { DiaryMonthNav } from "@/features/diary/diary-month-nav";
import { formatDiaryMonthSummary } from "@/features/diary/diary-month-summary";
import {
  normalizeDiaryFilter,
  normalizeDiaryPeriod,
  normalizeDiarySort,
} from "@/features/diary/diary-params";
import { DiaryTimeline } from "@/features/diary/diary-timeline";
import { LibraryEmptyState } from "@/features/library/library-empty-state";
import { LibrarySectionNav } from "@/features/library/library-section-nav";
import { LibrarySelect } from "@/features/library/library-select";
import { formatMonthParam } from "@/lib/month";
import { getDiaryActivityCalendar, getDiaryPage } from "@/server/diary/queries";
import type { DiaryFilter, DiaryPeriod, DiarySort } from "@/server/diary/types";

export const metadata: Metadata = {
  title: "Diary",
};

// Answers "what have I been watching?" — a chronological personal
// timeline, not a media-analytics dashboard (see docs/diary.md).
// Server-first, same as `/library` itself: filter/sort/month all live in
// the URL; the requested month's page is fetched and hydrated on the
// server, bounded to that one month (never the user's entire history —
// see docs/diary.md, "Month-scoped querying"); only within-month
// pagination and local-timezone date/session grouping need the browser
// at all (see `DiaryTimeline`).
export default async function DiaryPage({ searchParams }: PageProps<"/library/diary">) {
  const params = await searchParams;
  const filter = normalizeDiaryFilter(params.type);
  const sort = normalizeDiarySort(params.sort);
  const now = new Date();
  const period = normalizeDiaryPeriod(params.month, now);

  const [{ entries, nextCursor, hasMore }, activity] = await Promise.all([
    getDiaryPage({ filter, sort, cursor: null, period }),
    getDiaryActivityCalendar(),
  ]);

  const isFiltered = filter !== "all";
  // Real history exists *somewhere*, even if not in the requested month —
  // this is what distinguishes a genuinely brand-new account (never
  // watched anything, ever) from an established one just looking at a
  // quiet month (see docs/diary.md, "Empty vs. sparse").
  const hasAnyHistoryEver = activity.length > 0;
  const monthSummary = activity.find(
    (bucket) => bucket.year === period.year && bucket.month === period.month,
  ) ?? { movieCount: 0, episodeCount: 0 };
  const summaryLine = formatDiaryMonthSummary(monthSummary);

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <LibrarySectionNav active="diary" />
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Diary</h1>
        </div>

        {hasAnyHistoryEver ? (
          <>
            <div className="flex flex-col gap-4">
              <DiaryFilterToggle
                active={filter}
                sort={params.sort as string | undefined}
                period={period}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <DiaryMonthNav
                  period={period}
                  filter={filter}
                  sort={sort}
                  activity={activity}
                  now={now}
                />
                <LibrarySelect
                  label="Sort"
                  value={sort}
                  options={[
                    { value: "newest", label: "Newest" },
                    { value: "oldest", label: "Oldest" },
                  ].map((option) => ({
                    ...option,
                    href: buildHref({ filter, period }, { sort: option.value as DiarySort }),
                  }))}
                />
              </div>

              {summaryLine ? <p className="text-sm text-muted-foreground">{summaryLine}</p> : null}
            </div>

            {entries.length === 0 ? (
              isFiltered ? (
                <LibraryEmptyState
                  heading="Nothing here yet."
                  description={`No history matches this filter for ${formatDiaryMonthLabel(period)}.`}
                />
              ) : (
                <LibraryEmptyState
                  heading={`Nothing watched in ${formatDiaryMonthLabel(period)}.`}
                  description="Try another month — your history is still here."
                />
              )
            ) : (
              <DiaryTimeline
                key={`${filter}:${sort}:${period.year}-${period.month}`}
                initialEntries={entries}
                initialCursor={nextCursor}
                initialHasMore={hasMore}
                filter={filter}
                sort={sort}
                period={period}
              />
            )}
          </>
        ) : (
          <LibraryEmptyState
            heading="Nothing watched yet."
            description="Your watch history will appear here as you mark Movies and Episodes watched."
            showDiscoverLink
          />
        )}
      </div>
    </PageContainer>
  );
}

function buildHref(
  current: { filter: DiaryFilter; period: DiaryPeriod },
  overrides: Partial<{ sort: DiarySort }>,
): Route {
  const params = new URLSearchParams({ month: formatMonthParam(current.period) });
  if (current.filter !== "all") params.set("type", current.filter);
  if (overrides.sort === "oldest") params.set("sort", "oldest");
  return `/library/diary?${params.toString()}` as Route;
}
