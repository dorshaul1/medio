import { Clapperboard, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mediaHref } from "@/features/media/media-route";
import { MediaRowScroller } from "@/features/media/media-row-scroller";
import type { PersonKnownForItem } from "@/server/people/types";
import { posterUrl } from "@/server/tmdb/images";

// Poster/title/year only — the same information level as MediaPoster
// (see docs/media-provider.md, "Known For"), not a person-specific
// MediaPoster reuse, since PersonKnownForItem is a leaner shape (no
// overview/genres/rating were ever fetched for it — see
// server/people/types.ts).
function KnownForTile({ item }: { item: PersonKnownForItem }) {
  const poster = posterUrl(item.poster, "medium");
  const Icon = item.mediaType === "movie" ? Clapperboard : Tv;

  return (
    <Link
      href={mediaHref({ mediaType: item.mediaType, id: item.mediaProviderId })}
      className="group block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-surface-subtle">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 112px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon
              aria-hidden="true"
              strokeWidth={1.25}
              className="size-8 text-muted-foreground/60"
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
        {item.year ? (
          <p className="text-xs text-muted-foreground transition-colors group-hover:text-foreground/80 group-focus-visible:text-foreground/80">
            {item.year}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

// A small, curated selection near the top of the page — see
// server/people/compose.ts (selectKnownFor) for the ranking/omission
// rules. Renders nothing when there isn't a reliable selection to show,
// letting the full Filmography lead instead.
export function PersonKnownForRow({ items }: { items: readonly PersonKnownForItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="person-known-for" className="flex flex-col gap-3">
      <h2 id="person-known-for" className="text-lg font-medium tracking-tight">
        Known for
      </h2>
      <MediaRowScroller>
        {items.map((item) => (
          <div
            key={`${item.mediaType}-${item.mediaProviderId}`}
            className="w-28 shrink-0 sm:w-36 lg:w-44"
          >
            <KnownForTile item={item} />
          </div>
        ))}
      </MediaRowScroller>
    </section>
  );
}
