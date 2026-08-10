import type { Metadata } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { LibraryEmptyState } from "@/features/library/library-empty-state";
import { StatsHero } from "@/features/stats/stats-hero";
import { StatsTimeline } from "@/features/stats/stats-timeline";
import { TasteGenreSection } from "@/features/stats/taste-genre-insights";
import { TastePatternsSection } from "@/features/stats/taste-patterns-section";
import { TastePeopleSection } from "@/features/stats/taste-people-section";
import { TasteRatingsSection } from "@/features/stats/taste-ratings-section";
import { TasteRewatchSection } from "@/features/stats/taste-rewatch-section";
import { getStatsProfile } from "@/server/stats/compose";

export const metadata: Metadata = {
  title: "Stats",
};

// A top-level primary destination (see docs/stats.md) — "what does my own
// watch history actually say about me?" — deliberately not part of
// Library, and deliberately not an analytics dashboard: one editorial
// opening statement, a restrained viewing-rhythm chart, then curated
// Taste/People/Rewatch/Ratings insight sections. Every section below
// omits itself entirely when the underlying evidence is too thin to be
// meaningful — there is no "not enough data" placeholder anywhere on
// this page (see docs/stats.md, "Sparse data").
export default async function StatsPage() {
  const stats = await getStatsProfile();

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Stats</h1>

        {stats.hasAnyHistory ? (
          <div className="flex flex-col gap-10">
            <StatsHero
              headline={stats.headline}
              overview={stats.overview}
              estimatedViewingTime={stats.estimatedViewingTime}
            />
            <StatsTimeline timeline={stats.viewingTimeline} />
            <TasteGenreSection genres={stats.genres} />
            <TastePeopleSection directors={stats.directors} actors={stats.actors} />
            <TasteRewatchSection rewatch={stats.rewatch} />
            <TastePatternsSection movieVsShow={stats.movieVsShow} completion={stats.completion} />
            <TasteRatingsSection
              distribution={stats.ratingDistribution}
              comparison={stats.ratingComparison}
            />
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
