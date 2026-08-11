import type { Metadata } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { LibraryEmptyState } from "@/features/library/library-empty-state";
import { StatsComparisonSection } from "@/features/stats/stats-comparison";
import { StatsHero } from "@/features/stats/stats-hero";
import { StatsRangeControl } from "@/features/stats/stats-range-control";
import { StatsTimeline } from "@/features/stats/stats-timeline";
import { TasteGenreSection } from "@/features/stats/taste-genre-insights";
import { TastePatternsSection } from "@/features/stats/taste-patterns-section";
import { TastePeopleSection } from "@/features/stats/taste-people-section";
import { TasteRatingsSection } from "@/features/stats/taste-ratings-section";
import { TasteRewatchSection } from "@/features/stats/taste-rewatch-section";
import { getStatsActiveYears, getStatsComparison, getStatsProfile } from "@/server/stats/compose";
import {
  formatStatsRangeLabel,
  parseStatsRangeParam,
  statsRangeSupportsComparison,
} from "@/server/stats/range";
import type { StatsComparison, StatsProfile } from "@/server/stats/types";

export const metadata: Metadata = {
  title: "Stats",
};

// A top-level primary destination (see docs/stats.md) — "what does my own
// watch history actually say about me?" — deliberately not part of
// Library, and deliberately not an analytics dashboard: a compact date-
// range control, one editorial opening statement, a restrained viewing-
// rhythm chart, then curated Taste/People/Rewatch/Ratings insight
// sections. Every section below omits itself entirely when the
// underlying evidence is too thin to be meaningful — there is no "not
// enough data" placeholder anywhere on this page (see docs/stats.md,
// "Sparse data"). `?range=`/`?compare=` are real URL state, same
// convention as every other filter/sort in this app.
export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const params = await searchParams;
  const range = parseStatsRangeParam(params.range);
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
    // single-range profile is the correct fallback.
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
          <div className="flex flex-col gap-8">
            <StatsRangeControl
              activeRange={range}
              activeYears={activeYears}
              compare={compareRequested}
              now={new Date()}
            />

            {stats.hasAnyHistory ? (
              <div className="flex flex-col gap-10">
                <StatsHero
                  headline={stats.headline}
                  overview={stats.overview}
                  estimatedViewingTime={stats.estimatedViewingTime}
                />
                {comparison ? <StatsComparisonSection comparison={comparison} /> : null}
                <StatsTimeline rhythm={stats.viewingRhythm} />
                <TasteGenreSection genres={stats.genres} />
                <TastePeopleSection directors={stats.directors} actors={stats.actors} />
                <TasteRewatchSection rewatch={stats.rewatch} />
                <TastePatternsSection
                  movieVsShow={stats.movieVsShow}
                  completion={stats.completion}
                />
                <TasteRatingsSection
                  distribution={stats.ratingDistribution}
                  comparison={stats.ratingComparison}
                />
              </div>
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
            description="Watch and rate a few movies or shows to see your stats take shape."
            showDiscoverLink
          />
        )}
      </div>
    </PageContainer>
  );
}
