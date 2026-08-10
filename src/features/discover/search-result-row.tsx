import Image from "next/image";
import Link from "next/link";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { mediaHref } from "@/features/media/media-route";
import type { MediaSummary } from "@/server/media/types";
import { posterUrl } from "@/server/tmdb/images";

// Search is task-oriented (find a known title fast), not browsing — a
// horizontal scannable row, not another poster grid. Deliberately not
// MediaPoster reused at a smaller size: this needs a different shape
// (poster beside text, not below it), so it's its own composition.
export function SearchResultRow({ media }: { media: MediaSummary }) {
  const poster = posterUrl(media.poster, "small");

  return (
    <Link
      href={mediaHref(media)}
      className="group flex items-center gap-3 rounded-md p-2 outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-subtle sm:w-14">
        {poster ? (
          <Image src={poster} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <MediaPosterFallback mediaType={media.mediaType} />
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm font-medium text-foreground">{media.title}</p>
        {media.releaseYear ? (
          <p className="text-xs text-muted-foreground">{media.releaseYear}</p>
        ) : null}
      </div>
    </Link>
  );
}
