import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { MediaCollectionRowSkeleton } from "@/features/media/media-collection-row-skeleton";
import { truncateOverview } from "@/features/media/truncate-overview";
import { MovieCastRow } from "@/features/movies/movie-cast-row";
import { MovieHero } from "@/features/movies/movie-hero";
import { MovieRecommendations } from "@/features/movies/movie-recommendations";
import { parseMovieId } from "@/features/movies/parse-movie-id";
import {
  PartOfCollectionRow,
  PartOfCollectionRowSkeleton,
} from "@/features/movies/part-of-collection-row";
import type { MovieCredits, MovieDetails, Trailer } from "@/server/media/types";
import { getMediaOpinion } from "@/server/opinions/queries";
import type { MediaOpinion } from "@/server/opinions/types";
import { getPlanningState } from "@/server/planning/planning-items";
import type { PlanningIntent } from "@/server/planning/types";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import { TmdbError } from "@/server/tmdb/errors";
import { backdropUrl } from "@/server/tmdb/images";
import { getMovieCredits, getMovieDetails, getMovieTrailer } from "@/server/tmdb/queries";
import { getMovieWatchSummary, listMovieWatchEvents } from "@/server/tracking/movie-events";
import type { MovieWatchEvent, MovieWatchSummary } from "@/server/tracking/types";

// Movie details is the only ID-only lookup — no product screen depends on
// credits or the trailer existing, so both are fetched alongside the
// primary `getMovieDetails` call and degrade to "just don't show that
// part" on failure (`.catch(() => null)`) rather than failing the page.
// Credits specifically is fetched here rather than behind its own
// Suspense boundary because the director line lives in the hero, right
// next to the rest of the primary metadata — deferring credits would mean
// deferring that line too. Tracking data (private, user-owned — never
// shares TMDB's own cached responses; see docs/tracking.md) is fetched
// the same way: it's a fast local DB read, not worth its own Suspense
// boundary, and the hero needs it to render the tracking control at all.
// Recommendations is the one genuinely secondary section (see
// docs/media-provider.md): it streams in independently via Suspense and
// never blocks or breaks the rest of the page.
//
// Deliberately no route-level `loading.tsx`: Next wraps `page.tsx` itself
// in a Suspense boundary for any segment that has one, which starts the
// response streaming as a 200 before this component's own `notFound()`
// check below ever runs — the HTTP status can't change after that. A
// nonexistent movie genuinely 404ing matters more than a loading skeleton
// for what's normally a fast, revalidate-cached fetch.
export default async function MovieDetailsPage({ params }: PageProps<"/movies/[id]">) {
  const { id } = await params;
  const movieId = parseMovieId(id);
  if (movieId === null) notFound();

  const { movie, credits, trailer, watchSummary, watchEvents, planningIntent, opinion } =
    await fetchMoviePageData(movieId);
  const { defaultSaveIntent } = await getCurrentUserPreferences();

  return (
    <PageContainer>
      <div className="flex flex-col gap-10">
        <MovieHero
          movie={movie}
          directors={credits?.directors ?? []}
          trailer={trailer}
          watchSummary={watchSummary}
          watchEvents={watchEvents}
          planningIntent={planningIntent}
          opinion={opinion}
          defaultSaveIntent={defaultSaveIntent}
        />

        {movie.overview ? (
          <section aria-labelledby="movie-overview" className="flex flex-col gap-3 sm:max-w-3xl">
            <h2 id="movie-overview" className="text-lg font-medium tracking-tight">
              Overview
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90">{movie.overview}</p>
          </section>
        ) : null}

        {credits ? <MovieCastRow cast={credits.cast} /> : null}

        {movie.collection ? (
          <Suspense fallback={<PartOfCollectionRowSkeleton />}>
            <PartOfCollectionRow collection={movie.collection} currentMovieId={movieId} />
          </Suspense>
        ) : null}

        <Suspense fallback={<MediaCollectionRowSkeleton title="More like this" />}>
          <MovieRecommendations movieId={movieId} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function fetchMoviePageData(id: number): Promise<{
  movie: MovieDetails;
  credits: MovieCredits | null;
  trailer: Trailer | null;
  watchSummary: MovieWatchSummary;
  watchEvents: readonly MovieWatchEvent[];
  planningIntent: PlanningIntent | null;
  opinion: MediaOpinion;
}> {
  const [movie, credits, trailer, watchSummary, watchEvents, planningState, opinion] =
    await Promise.all([
      fetchMovie(id),
      getMovieCredits(id).catch(() => null),
      getMovieTrailer(id).catch(() => null),
      getMovieWatchSummary(id),
      listMovieWatchEvents(id),
      getPlanningState("movie", id),
      getMediaOpinion({ mediaType: "movie", mediaProviderId: id }),
    ]);
  return {
    movie,
    credits,
    trailer,
    watchSummary,
    watchEvents,
    planningIntent: planningState?.intent ?? null,
    opinion,
  };
}

async function fetchMovie(id: number): Promise<MovieDetails> {
  try {
    return await getMovieDetails(id);
  } catch (error) {
    if (error instanceof TmdbError && error.kind === "not_found") {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps<"/movies/[id]">): Promise<Metadata> {
  const { id } = await params;
  const movieId = parseMovieId(id);
  if (movieId === null) return {};

  try {
    const movie = await getMovieDetails(movieId);
    const description = movie.overview ? truncateOverview(movie.overview) : undefined;
    const image = backdropUrl(movie.backdrop, "large") ?? undefined;

    return {
      title: movie.title,
      description,
      openGraph: {
        title: movie.title,
        description,
        images: image ? [{ url: image }] : undefined,
      },
    };
  } catch {
    return {};
  }
}
