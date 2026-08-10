import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { MediaCollectionRowSkeleton } from "@/features/media/media-collection-row-skeleton";
import { truncateOverview } from "@/features/media/truncate-overview";
import { parseShowId } from "@/features/shows/parse-show-id";
import { SeasonRow } from "@/features/shows/season-row";
import { ShowCastRow } from "@/features/shows/show-cast-row";
import { ShowHero } from "@/features/shows/show-hero";
import { ShowRecommendations } from "@/features/shows/show-recommendations";
import {
  ShowTrackingSection,
  ShowTrackingSectionSkeleton,
} from "@/features/shows/show-tracking-section";
import type { ShowDetails, Trailer } from "@/server/media/types";
import { TmdbError } from "@/server/tmdb/errors";
import { backdropUrl } from "@/server/tmdb/images";
import { getShowDetails, getShowTrailer } from "@/server/tmdb/queries";

// Show Details' own information hierarchy (see docs/architecture.md,
// "Show vs Movie Details"): identity, overview, then Seasons — the
// primary product surface a show page exists to lead into — ahead of
// Cast and related shows, both of which stream in independently via
// Suspense since neither is needed for the page's primary identity (a
// show's creators, unlike a movie's director, come straight from
// ShowDetails itself, so Cast doesn't need to block anything here the
// way credits briefly did on Movie Details).
//
// Deliberately no route-level `loading.tsx` — see the equivalent comment
// on src/app/(app)/movies/[id]/page.tsx for why: it would silently
// downgrade a real 404 to an HTTP 200.
export default async function ShowDetailsPage({ params }: PageProps<"/shows/[id]">) {
  const { id } = await params;
  const showId = parseShowId(id);
  if (showId === null) notFound();

  const { show, trailer } = await fetchShowPageData(showId);

  return (
    <PageContainer>
      <div className="flex flex-col gap-10">
        <ShowHero
          show={show}
          trackingControl={
            <Suspense fallback={<ShowTrackingSectionSkeleton />}>
              <ShowTrackingSection
                showProviderId={showId}
                title={show.title}
                seasons={show.seasons}
                showStatus={show.status}
                nextEpisodeToAir={show.nextEpisodeToAir}
                trailer={trailer}
              />
            </Suspense>
          }
        />

        {show.overview ? (
          <section aria-labelledby="show-overview" className="flex flex-col gap-3 sm:max-w-3xl">
            <h2 id="show-overview" className="text-lg font-medium tracking-tight">
              Overview
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90">{show.overview}</p>
          </section>
        ) : null}

        <SeasonRow showId={showId} seasons={show.seasons} />

        <Suspense fallback={<MediaCollectionRowSkeleton title="Cast" />}>
          <ShowCastRow showId={showId} />
        </Suspense>

        <Suspense fallback={<MediaCollectionRowSkeleton title="More like this" />}>
          <ShowRecommendations showId={showId} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function fetchShowPageData(id: number): Promise<{
  show: ShowDetails;
  trailer: Trailer | null;
}> {
  const [show, trailer] = await Promise.all([fetchShow(id), getShowTrailer(id).catch(() => null)]);
  return { show, trailer };
}

async function fetchShow(id: number): Promise<ShowDetails> {
  try {
    return await getShowDetails(id);
  } catch (error) {
    if (error instanceof TmdbError && error.kind === "not_found") {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps<"/shows/[id]">): Promise<Metadata> {
  const { id } = await params;
  const showId = parseShowId(id);
  if (showId === null) return {};

  try {
    const show = await getShowDetails(showId);
    const description = show.overview ? truncateOverview(show.overview) : undefined;
    const image = backdropUrl(show.backdrop, "large") ?? undefined;

    return {
      title: show.title,
      description,
      openGraph: {
        title: show.title,
        description,
        images: image ? [{ url: image }] : undefined,
      },
    };
  } catch {
    return {};
  }
}
