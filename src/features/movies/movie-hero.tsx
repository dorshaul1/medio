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
  const essentialMetadata = buildEssentialMetadataLine(movie);
  const genres = movie.genres.length > 0 ? movie.genres.map((genre) => genre.name).join(", ") : null;
  const desktopMetadata = genres ? [...essentialMetadata, genres] : essentialMetadata;

  return (
    <MediaDetailHero
      backdrop={backdrop}
      poster={poster}
      mediaType="movie"
      identity={
        <>
          <h1 className="font-display text-2xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl sm:leading-[0.95]">
            {movie.title}
          </h1>
          {movie.tagline ? (
            <p className="text-sm text-muted-foreground italic">{movie.tagline}</p>
          ) : null}
          {/* Genres join this same line on desktop (the pre-mobile-audit
              arrangement) — only mobile splits them out to their own
              full-width line below the poster (see the genres <p>
              below). Two breakpoint-specific renders, not a client
              viewport check — both are inert static text. */}
          <MetadataLine parts={essentialMetadata} className="sm:hidden" />
          <MetadataLine parts={desktopMetadata} className="hidden sm:flex" />
        </>
      }
    >
      {genres ? <p className="text-sm text-muted-foreground sm:hidden">{genres}</p> : null}

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

      <div className="mt-1 flex flex-wrap items-center gap-2">
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

// Year/runtime/rating sit beside the poster, next to the title — genres
// and directors deliberately aren't folded in here; they read better
// full-width below the poster+title row (see the caller).
function buildEssentialMetadataLine(movie: MovieDetails): ReactNode[] {
  const parts: ReactNode[] = [];

  if (movie.releaseYear) parts.push(movie.releaseYear);
  if (movie.runtimeMinutes) parts.push(formatRuntime(movie.runtimeMinutes));
  if (movie.providerRating > 0) parts.push(providerRatingPart(movie.providerRating));

  return parts;
}
