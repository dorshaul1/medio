import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import {
  CalendarEntryPoint,
  CalendarEntryPointFallback,
} from "@/features/home/calendar-entry-point";
import {
  InTheatersCollection,
  PopularMoviesCollection,
  PopularShowsCollection,
  TrendingMoviesCollection,
  TrendingShowsCollection,
} from "@/features/home/home-collections";
import { PersonalizedHomeSections } from "@/features/home/personalized-home-sections";
import { PickEntryPoint } from "@/features/home/pick-entry-point";
import { MediaCollectionRowSkeleton } from "@/features/media/media-collection-row-skeleton";
import type { PublicHomeSection } from "@/server/home/layout";
import { resolveHomeLayout } from "@/server/home/layout";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

export const metadata: Metadata = {
  title: "Home",
};

const PUBLIC_SECTIONS: Record<PublicHomeSection, React.ReactNode> = {
  trending_movies: (
    <Suspense
      key="trending_movies"
      fallback={<MediaCollectionRowSkeleton title="Trending movies" size="large" />}
    >
      <TrendingMoviesCollection />
    </Suspense>
  ),
  trending_shows: (
    <Suspense key="trending_shows" fallback={<MediaCollectionRowSkeleton title="Trending shows" />}>
      <TrendingShowsCollection />
    </Suspense>
  ),
  in_theaters: (
    <Suspense key="in_theaters" fallback={<MediaCollectionRowSkeleton title="In theaters" />}>
      <InTheatersCollection />
    </Suspense>
  ),
  popular_movies: (
    <Suspense key="popular_movies" fallback={<MediaCollectionRowSkeleton title="Popular movies" />}>
      <PopularMoviesCollection />
    </Suspense>
  ),
  popular_shows: (
    <Suspense key="popular_shows" fallback={<MediaCollectionRowSkeleton title="Popular shows" />}>
      <PopularShowsCollection />
    </Suspense>
  ),
};

// Two layers: what makes sense for *this* user to watch next (Up Next /
// Finish Soon / Continue Watching), and what's timely in the wider media
// world (Trending, In theaters, Popular) — see docs/home.md. Which comes
// first, and how many public sections show, is the one thing "Home
// focus" (see docs/settings.md) controls; nothing about the underlying
// data or classification changes. Personalized Home is its own Suspense
// boundary with no fallback (see PersonalizedHomeSections' own comment
// on why a skeleton here would be misleading) so it neither blocks nor
// waits on the public sections.
export default async function HomePage() {
  const preferences = await getCurrentUserPreferences();
  const layout = resolveHomeLayout(preferences.homeFocus);

  const personal = (
    <Suspense fallback={null}>
      <PersonalizedHomeSections showFinishSoon={preferences.showFinishSoon} />
    </Suspense>
  );
  const publicSections = layout.publicSections.map((section) => PUBLIC_SECTIONS[section]);

  return (
    <PageContainer>
      <PageHeader
        title="Home"
        action={
          <div className="flex items-center gap-2">
            <Suspense fallback={<CalendarEntryPointFallback />}>
              <CalendarEntryPoint />
            </Suspense>
            <PickEntryPoint />
          </div>
        }
      />
      <div className="flex flex-col gap-10">
        {layout.personalFirst ? (
          <>
            {personal}
            {publicSections}
          </>
        ) : (
          <>
            {publicSections}
            {personal}
          </>
        )}
      </div>
    </PageContainer>
  );
}
