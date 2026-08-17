import Image from "next/image";
import Link from "next/link";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { mediaHref } from "@/features/media/media-route";
import type { MediaImage, MediaType } from "@/server/media/types";
import { posterUrl } from "@/server/tmdb/images";

// A single artwork-led title insight (most rewatched movie, most
// revisited show) — real poster art, not a text-only stat, matching
// "use actual media artwork for high-value insights" (see docs/stats.md,
// "Title insight"). Deliberately not a full `MediaPoster` browse tile:
// the supporting fact here is the taste evidence itself
// ("Watched 4 times"), not provider metadata.
export function TasteTitleCard({
  mediaType,
  mediaProviderId,
  title,
  poster,
  supportingFact,
}: {
  mediaType: MediaType;
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  supportingFact: string;
}) {
  const resolvedPoster = posterUrl(poster, "small");

  return (
    <Link
      href={mediaHref({ mediaType, id: mediaProviderId })}
      className="group flex w-28 shrink-0 flex-col gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-32"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-surface-subtle">
        {resolvedPoster ? (
          <Image
            src={resolvedPoster}
            alt=""
            fill
            sizes="128px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          />
        ) : (
          <MediaPosterFallback mediaType={mediaType} />
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-foreground/80 group-focus-visible:text-foreground/80">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{supportingFact}</p>
      </div>
    </Link>
  );
}
