import { Clapperboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaPoster } from "@/features/media/media-poster";
import { mediaHref } from "@/features/media/media-route";
import { cn } from "@/lib/utils";
import type { MediaSummary, MovieCollection } from "@/server/media/types";
import { backdropUrl, posterUrl } from "@/server/tmdb/images";
import { getCollectionMovies } from "@/server/tmdb/queries";

// The Suspense fallback for PartOfCollectionRow below — approximates the
// full-bleed-art-card shape so the page doesn't jump when the real
// section arrives. The collection's name/art isn't known synchronously
// (unlike MediaCollectionRowSkeleton's section titles), so everything
// here is a skeleton, not real copy.
export function PartOfCollectionRowSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-subtle p-4 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex gap-3 sm:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          // A static-length placeholder list that never reorders — see
          // MediaCollectionRowSkeleton for the same documented exception.
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
          <Skeleton key={index} className="aspect-2/3 w-24 shrink-0 sm:w-32" />
        ))}
      </div>
    </div>
  );
}

// A small local poster tile, not the shared MediaPoster — MediaPoster's
// caption uses theme tokens (text-foreground/text-muted-foreground),
// which assume sitting on plain page background. Every tile here sits
// directly on the collection's own artwork under a fixed dark scrim
// (see the section below), regardless of app theme, so the caption needs
// fixed light text for the same reason the scrim itself is a fixed color,
// not a token — see design-system.md's "floats over unpredictable
// artwork" precedent (Dialog's overlay, MediaRowScroller's buttons).
function CollectionPosterTile({ media }: { media: MediaSummary }) {
  const poster = posterUrl(media.poster, "small");

  return (
    <Link
      href={mediaHref(media)}
      className="group block w-24 shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/70 sm:w-32"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-white/10">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 640px) 128px, 96px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Clapperboard aria-hidden="true" strokeWidth={1.25} className="size-6 text-white/50" />
          </div>
        )}
      </div>
      <p className="mt-1.5 line-clamp-1 text-xs font-medium text-white">{media.title}</p>
      {media.releaseYear ? (
        <p className="text-[0.6875rem] text-white/65">{media.releaseYear}</p>
      ) : null}
    </Link>
  );
}

// "Part of…" — the franchise collection a movie belongs to (e.g. "The
// Dark Knight Collection"), when TMDB has one on file. Its own Suspense
// boundary and failure boundary (see the page), same reasoning as
// MovieRecommendations: genuinely secondary, streams in independently,
// never blocks or breaks the rest of the page. Excludes the movie
// currently being viewed — showing it inside its own "part of" row is
// noise, not information.
//
// A bespoke full-bleed-artwork card, not MediaCollectionRow — a
// collection has its own real artwork (TMDB gives every collection a
// poster/backdrop), used as the whole card's background rather than a
// plain text heading above yet another poster row. The one deliberately
// earned container/border in this feature (see design-system.md): it's
// presenting a distinct branded entity, not wrapping ordinary content.
export async function PartOfCollectionRow({
  collection,
  currentMovieId,
}: {
  collection: MovieCollection;
  currentMovieId: number;
}) {
  try {
    const items = await getCollectionMovies(collection.id);
    const rest = items.filter((item) => item.id !== currentMovieId);
    if (rest.length === 0) return null;

    const art = backdropUrl(collection.backdrop, "large") ?? posterUrl(collection.poster, "large");

    return (
      <section
        aria-labelledby="movie-collection"
        className="relative overflow-hidden rounded-lg border border-border"
      >
        {art ? (
          <>
            <Image
              src={art}
              alt=""
              fill
              sizes="(min-width: 640px) 700px, 100vw"
              className="object-cover"
            />
            {/* A fixed (non-theme) scrim, not a token — this sits over
                unpredictable collection artwork spanning the whole card,
                so both the heading and every poster caption below need
                to read against any color it happens to be, in either
                app theme. */}
            <div className="absolute inset-0 bg-black/72" />
          </>
        ) : (
          <div className="absolute inset-0 bg-surface-subtle" />
        )}

        <div className="relative flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-0.5">
            <p
              className={cn(
                "text-xs font-medium tracking-wide uppercase",
                art ? "text-white/75" : "text-muted-foreground",
              )}
            >
              Collection
            </p>
            <h2
              className={cn(
                "text-lg font-medium tracking-tight text-balance sm:text-xl",
                art ? "text-white" : "text-foreground",
              )}
              id="movie-collection"
            >
              {collection.name}
            </h2>
          </div>

          <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 sm:gap-4">
            {rest.map((item) =>
              art ? (
                <CollectionPosterTile key={`${item.mediaType}-${item.id}`} media={item} />
              ) : (
                // No artwork to sit on — falls back to the ordinary
                // themed poster tile instead of forcing fixed light text
                // onto a plain surface background.
                <div key={`${item.mediaType}-${item.id}`} className="w-24 shrink-0 sm:w-32">
                  <MediaPoster media={item} />
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    );
  } catch {
    return null;
  }
}
