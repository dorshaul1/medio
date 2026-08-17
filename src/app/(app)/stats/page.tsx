import type { Metadata } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { LibraryEmptyState } from "@/features/library/library-empty-state";
import { StatsComparisonSection } from "@/features/stats/stats-comparison";
import { StatsHero } from "@/features/stats/stats-hero";
import { StatsPatternsSection } from "@/features/stats/stats-patterns-section";
import { StatsRangeControl } from "@/features/stats/stats-range-control";
import type { StatsTab } from "@/features/stats/stats-tabs";
import { StatsTabs } from "@/features/stats/stats-tabs";
import { StatsTimeline } from "@/features/stats/stats-timeline";
import { StatsWeekdaySection } from "@/features/stats/stats-weekday-section";
import { TasteGenreSection } from "@/features/taste/taste-genre-insights";
import { TasteHero } from "@/features/taste/taste-hero";
import { TastePeopleSection } from "@/features/taste/taste-people-section";
import { TasteRewatchSection } from "@/features/taste/taste-rewatch-section";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import { getStatsActiveYears, getStatsComparison, getStatsProfile } from "@/server/stats/compose";
import {
  formatStatsRangeLabel,
  parseStatsRangeParam,
  resolveDefaultStatsRange,
  statsRangeSupportsComparison,
} from "@/server/stats/range";
import type { StatsComparison, StatsProfile } from "@/server/stats/types";

export const metadata: Metadata = {
  title: "Stats",
};

function parseStatsTabParam(value: string | string[] | undefined): StatsTab {
  return value === "taste" ? "taste" : "overview";
}

// MEDIO's one personal analytics/insight destination — Overview
// (temporal viewing activity) and Taste (genre/people/rewatch
// preference) as two tabs sharing one date range, not two separate
// routes (see docs/stats.md, "Information architecture"). Not an
// analytics dashboard: a compact date-range control, an understated tab
// switch, and each tab's own small set of curated, editorial insights.
// `?range=`/`?compare=`/`?tab=` are all real URL state, same convention
// as every other filter/sort in this app — switching tabs never loses
// the selected range.
export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const params = await searchParams;
  const now = new Date();
  const preferences = await getCurrentUserPreferences();
  const defaultRange = resolveDefaultStatsRange(preferences.statsDefaultRange, now);
  const range = parseStatsRangeParam(params.range, defaultRange);
  const tab = parseStatsTabParam(params.tab);
  const compareRequested = params.compare === "1" && statsRangeSupportsComparison(range);

  const [activeYears, resolved] = await Promise.all([
    getStatsActiveYears(),
    compareRequested ? getStatsComparison(range) : null,
  ]);

  let stats: StatsProfile;
  let comparison: StatsComparison = null;
  if (resolved) {
    stats = resolved.current;
    comparison = resolved.comparison;
  } else {
    // Either comparison wasn't requested, or the range turned out not to
    // support one after all (defensive — `statsRangeSupportsComparison`
    // already guards `compareRequested` above) — either way, the plain
    // single-range profile is the correct fallback. One fetch serves
    // both tabs: `StatsProfile` already carries every field Taste
    // renders, so switching tabs never triggers a second query.
    stats = await getStatsProfile(range);
  }

  // Real history exists *somewhere*, even if not in the selected range —
  // this is what distinguishes a genuinely brand-new account from an
  // established one just looking at a quiet period (see docs/stats.md,
  // "Empty vs. sparse vs. no history in range" — the same distinction
  // Diary's own month-scoped browsing already makes).
  const hasAnyHistoryEver = activeYears.length > 0;

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Stats</h1>

        {hasAnyHistoryEver ? (
          <div className="flex flex-col gap-6">
            <StatsRangeControl activeRange={range} compare={compareRequested} />
            <StatsTabs active={tab} range={range} compare={compareRequested} />

            {stats.hasAnyHistory ? (
              tab === "overview" ? (
                <div className="flex flex-col gap-10">
                  <StatsHero
                    range={stats.range}
                    overview={stats.overview}
                    estimatedViewingTime={stats.estimatedViewingTime}
                  />
                  {comparison ? <StatsComparisonSection comparison={comparison} /> : null}
                  <StatsTimeline rhythm={stats.viewingRhythm} />
                  <StatsWeekdaySection weekday={stats.weekdayRhythm} />
                  <StatsPatternsSection
                    movieVsShow={stats.movieVsShow}
                    completion={stats.completion}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  <TasteHero
                    headline={stats.headline}
                    overview={stats.overview}
                    estimatedViewingTime={stats.estimatedViewingTime}
                  />
                  <TasteGenreSection genres={stats.genres} />
                  <TastePeopleSection directors={stats.directors} actors={stats.actors} />
                  <TasteRewatchSection rewatch={stats.rewatch} />
                </div>
              )
            ) : (
              <LibraryEmptyState
                heading={`Nothing watched in ${formatStatsRangeLabel(range)}.`}
                description="Try another range — your stats are still here."
              />
            )}
          </div>
        ) : (
          <LibraryEmptyState
            heading="No stats yet."
            description="Watch a few movies or shows to see your stats take shape."
            showDiscoverLink
          />
        )}
      </div>
    </PageContainer>
  );
}
