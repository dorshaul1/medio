import { Suspense } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { BacklogRowSection } from "@/features/home/backlog-row-section";
import {
  CalendarEntryPoint,
  CalendarEntryPointFallback,
} from "@/features/home/calendar-entry-point";
import { HomeCalendarAgenda } from "@/features/home/home-calendar-agenda";
import { HomeCalendarMonth } from "@/features/home/home-calendar-month";
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

// The authenticated `/` experience — factored out of app/page.tsx so
// that file can branch between this and the public Landing page by
// session state (see docs/authentication.md, "`/` behavior by auth
// state") without Home's own composition needing to know that branching
// exists. Three independent preferences compose here — see docs/home.md,
// "Up Next is a separate preference": `showUpNext` decides whether Up
// Next renders at the very top, in every layout; `homeLayout`
// (`resolveHomeLayout`, `server/home/layout.ts`) decides what fills the
// page underneath it; `homeCalendarView` decides, only when the Calendar
// layout's body is showing, whether that body is the Today/This week/
// Later agenda or the full month grid (the same "upcoming"/"calendar"
// choice `/calendar` itself offers, reused for this different
// destination). Balanced adds continuation rows, a small calendar
// teaser, and a couple of public discovery rows; Personal adds
// continuation rows and a Backlog row with discovery cut further;
// Calendar replaces everything below Up Next with its own body and
// nothing else — never just a reordering of the same fixed rows. Each
// piece is its own Suspense boundary with no fallback (see
// PersonalizedHomeSections' own comment on why a skeleton here would be
// misleading), so none of them block each other.
export async function HomePage() {
  const preferences = await getCurrentUserPreferences();
  const layout = resolveHomeLayout(preferences.homeLayout);

  const publicSections = layout.publicSections.map((section) => PUBLIC_SECTIONS[section]);

  const calendarBody =
    layout.calendarAgendaSize === "full" ? (
      preferences.homeCalendarView === "calendar" ? (
        <HomeCalendarMonth />
      ) : (
        <HomeCalendarAgenda size="full" />
      )
    ) : layout.calendarAgendaSize === "preview" ? (
      <HomeCalendarAgenda size="preview" />
    ) : null;

  return (
    <PageContainer>
      <PageHeader
        title="Home"
        action={
          // `flex-wrap`: a safety net on the narrowest phones, where
          // "Calendar · N this week" + "Pick for me" together can still
          // be wider than the viewport even on their own line below the
          // title — Pick wraps to a second line rather than clipping.
          <div className="flex flex-wrap items-center gap-2">
            <Suspense fallback={<CalendarEntryPointFallback />}>
              <CalendarEntryPoint />
            </Suspense>
            <PickEntryPoint />
          </div>
        }
      />
      <div className="flex flex-col gap-10">
        <Suspense fallback={null}>
          <PersonalizedHomeSections
            showUpNext={preferences.showUpNext}
            showFinishSoon={preferences.showFinishSoon}
            showContinuationRows={layout.showContinuationRows}
          />
        </Suspense>
        {layout.showBacklogRow ? (
          <Suspense fallback={null}>
            <BacklogRowSection />
          </Suspense>
        ) : null}
        {calendarBody ? <Suspense fallback={null}>{calendarBody}</Suspense> : null}
        {publicSections}
      </div>
    </PageContainer>
  );
}
