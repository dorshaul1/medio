import { Fragment, type ReactNode } from "react";
import { formatRuntime } from "@/features/media/format-runtime";
import { hasReleased as checkHasReleased } from "@/features/media/has-released";
import { MediaComment } from "@/features/media/media-comment";
import { MediaDetailHero } from "@/features/media/media-detail-hero";
import { MetadataLine, providerRatingPart } from "@/features/media/metadata-line";
import { PersonLink } from "@/features/media/person-link";
import { PlanningControl } from "@/features/media/planning-control";
import { TrailerButton } from "@/features/media/trailer-button";
import { MovieTrackingControl } from "@/features/movies/movie-tracking-control";
import type { CreditedPerson, MovieDetails, Trailer } from "@/server/media/types";
import type { PlanningIntent } from "@/server/planning/types";
import { backdropUrl, posterUrl } from "@/server/tmdb/images";
import type { MovieWatchEvent, MovieWatchSummary } from "@/server/tracking/types";

// Identity + essential metadata — the page's primary, blocking content.
// The artwork shell (backdrop/poster/back button/positioning) is
// MediaDetailHero, shared with Show Details; everything below is this
// page's own information hierarchy.
export function MovieHero({
  movie,
  directors,
  trailer,
  watchSummary,
  watchEvents,
  planningIntent,
  comment,
  defaultSaveIntent,
}: {
  movie: MovieDetails;
  directors: readonly CreditedPerson[];
  trailer: Trailer | null;
  watchSummary: MovieWatchSummary;
  watchEvents: readonly MovieWatchEvent[];
  planningIntent: PlanningIntent | null;
  comment: string | null;
  defaultSaveIntent: PlanningIntent;
}) {
  const backdrop = backdropUrl(movie.backdrop, "large");
  const poster = posterUrl(movie.poster, "large");
  const metadata = buildMetadataLine(movie);

  return (
    <MediaDetailHero backdrop={backdrop} poster={poster} mediaType="movie">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          {movie.title}
        </h1>
        {movie.tagline ? (
          <p className="text-sm text-muted-foreground italic">{movie.tagline}</p>
        ) : null}
      </div>

      <MetadataLine parts={metadata} />

      {directors.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Directed by{" "}
          {directors.map((director, index) => (
            <Fragment key={director.id}>
              {index > 0 ? ", " : ""}
              <PersonLink id={director.id} name={director.name} />
            </Fragment>
          ))}
        </p>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <MovieTrackingControl
          movieProviderId={movie.id}
          summary={watchSummary}
          events={watchEvents}
          hasReleased={checkHasReleased(movie.releaseDate)}
        />
        {/* Planning only makes sense before a movie has actually been
            watched — once watched, it belongs to history, not a future
            intent list (see docs/library.md, "Watched media and
            planning"). */}
        {!watchSummary.hasWatched ? (
          <PlanningControl
            mediaType="movie"
            mediaProviderId={movie.id}
            intent={planningIntent}
            title={movie.title}
            defaultIntent={defaultSaveIntent}
          />
        ) : null}
        {trailer ? <TrailerButton trailer={trailer} title={movie.title} /> : null}
        {/* The Comment action only becomes relevant once the movie has
            actually been watched, even partially — see docs/opinions.md,
            "Eligibility". Real watch history (an early/festival
            screening) always takes priority over the release-date gate
            elsewhere on this control; the comment follows the same
            `hasWatched` signal, not a separate check. Sits in the same
            action row as tracking/planning/trailer, not a separate line
            below. */}
        {watchSummary.hasWatched ? (
          <MediaComment
            mediaType="movie"
            mediaProviderId={movie.id}
            title={movie.title}
            comment={comment}
          />
        ) : null}
      </div>
    </MediaDetailHero>
  );
}

// Directors deliberately aren't folded in here — see the caller, they
// read better as their own sentence-like line than jammed into a terse
// row.
function buildMetadataLine(movie: MovieDetails): ReactNode[] {
  const parts: ReactNode[] = [];

  if (movie.releaseYear) parts.push(movie.releaseYear);
  if (movie.runtimeMinutes) parts.push(formatRuntime(movie.runtimeMinutes));
  if (movie.providerRating > 0) parts.push(providerRatingPart(movie.providerRating));
  if (movie.genres.length > 0) parts.push(movie.genres.map((genre) => genre.name).join(", "));

  return parts;
}
