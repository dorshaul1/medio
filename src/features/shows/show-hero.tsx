import { Fragment, type ReactNode } from "react";
import { formatRuntime } from "@/features/media/format-runtime";
import { MediaDetailHero } from "@/features/media/media-detail-hero";
import { MetadataLine, providerRatingPart } from "@/features/media/metadata-line";
import { PersonLink } from "@/features/media/person-link";
import { formatShowYearRange } from "@/features/shows/format-show-year-range";
import { pluralize } from "@/features/shows/pluralize";
import type { ShowDetails } from "@/server/media/types";
import { backdropUrl, posterUrl } from "@/server/tmdb/images";

// Identity + essential metadata — the page's primary, blocking content.
// The artwork shell is MediaDetailHero, shared with Movie Details; the
// information hierarchy below is Show Details' own: year range/status
// read together (see formatShowYearRange) so "is it still airing?" is
// answered by the same line as "when did it run?", and a distinct scale
// line ("4 seasons · 73 episodes") a movie has no equivalent of.
// `trackingControl` is a slot, not a direct fetch here — the tracking
// view genuinely needs per-season episode data (see
// features/shows/show-tracking-view.ts), so the page renders it as its
// own Suspense-deferred section and passes the result in, keeping this
// component's own render synchronous and fast. The trailer action lives
// *inside* that same slot (see ShowTrackingSection) rather than as a
// sibling here, so it always aligns with the status row itself — never
// vertically centered against the section's full height once the
// opinion row below adds height (see docs/tracking.md).
export function ShowHero({
  show,
  trackingControl,
}: {
  show: ShowDetails;
  trackingControl: ReactNode;
}) {
  const backdrop = backdropUrl(show.backdrop, "large");
  const poster = posterUrl(show.poster, "large");
  const metadata = buildMetadataLine(show);
  const scale = buildScaleLine(show);

  return (
    <MediaDetailHero backdrop={backdrop} poster={poster} mediaType="show">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl leading-[0.95] font-medium tracking-tight text-balance sm:text-6xl">
          {show.title}
        </h1>
        {show.tagline ? (
          <p className="text-sm text-muted-foreground italic">{show.tagline}</p>
        ) : null}
      </div>

      <MetadataLine parts={metadata} />

      {scale ? <p className="text-sm text-muted-foreground">{scale}</p> : null}

      {show.creators.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Created by{" "}
          {show.creators.map((creator, index) => (
            <Fragment key={creator.id}>
              {index > 0 ? ", " : ""}
              <PersonLink id={creator.id} name={creator.name} />
            </Fragment>
          ))}
        </p>
      ) : null}

      <div className="mt-1 flex justify-center sm:justify-start">{trackingControl}</div>
    </MediaDetailHero>
  );
}

// Year range + status read together as one line — see
// formatShowYearRange for why the range itself already communicates
// ongoing vs. concluded (the trailing "–present"), with the raw status
// word alongside for an unambiguous, explicit answer to "is it still
// airing?" rather than making the reader infer it from a dash.
function buildMetadataLine(show: ShowDetails): ReactNode[] {
  const parts: ReactNode[] = [];

  const yearRange = formatShowYearRange(show.firstAirYear, lastAirYear(show), show.status);
  if (yearRange) parts.push(yearRange);
  if (show.status) parts.push(show.status);
  if (show.providerRating > 0) parts.push(providerRatingPart(show.providerRating));
  if (show.genres.length > 0) parts.push(show.genres.map((genre) => genre.name).join(", "));

  return parts;
}

function lastAirYear(show: ShowDetails): number | null {
  if (!show.lastAirDate) return null;
  const year = Number.parseInt(show.lastAirDate.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

// "4 seasons · 73 episodes · ~45m episodes" — how large a commitment the
// show is, distinct from the identity metadata line above it. Omits the
// runtime segment entirely when TMDB has none on file rather than
// inventing a precision it doesn't have.
function buildScaleLine(show: ShowDetails): string | null {
  if (show.numberOfSeasons === 0 && show.numberOfEpisodes === 0) return null;

  const parts = [
    pluralize(show.numberOfSeasons, "season"),
    pluralize(show.numberOfEpisodes, "episode"),
  ];
  if (show.episodeRuntimeMinutes) {
    parts.push(`~${formatRuntime(show.episodeRuntimeMinutes)} episodes`);
  }
  return parts.join(" · ");
}
