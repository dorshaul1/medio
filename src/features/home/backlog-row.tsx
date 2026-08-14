import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { MediaRowScroller } from "@/features/media/media-row-scroller";
import type { HomeBacklogItem } from "@/server/home/types";
import { posterUrl } from "@/server/tmdb/images";

// A poster + title + year — deliberately lighter than ContinueWatchingTile
// (no progress strip, no next-episode line): a Backlog title hasn't been
// started, so there's no progress to show yet (see docs/home.md,
// "Personal mode"). Links straight to the title's own Details page, not a
// specific episode.
function BacklogTile({ item }: { item: HomeBacklogItem }) {
  const poster = posterUrl(item.poster, "medium");
  const href = (
    item.mediaType === "movie"
      ? `/movies/${item.mediaProviderId}`
      : `/shows/${item.mediaProviderId}`
  ) as Route;

  return (
    <Link
      href={href}
      aria-label={item.year ? `${item.title}, ${item.year}` : item.title}
      className="group block w-32 shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-40"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-surface-subtle">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 640px) 160px, 128px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          />
        ) : (
          <MediaPosterFallback mediaType={item.mediaType} />
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
        {item.year ? <p className="text-xs text-muted-foreground">{item.year}</p> : null}
      </div>
    </Link>
  );
}

// Personal mode's own row — see docs/home.md, "Personal mode". Purely
// presentational (props in, same as `ContinueWatchingRow`), kept in its
// own file with no server-only import chain so it's directly
// unit-testable — the data fetch lives in `backlog-row-section.tsx`,
// same split `personalized-home-sections.tsx`/`continue-watching-row.tsx`
// already establish. Renders nothing at all once the user has no Backlog
// titles, exactly like every other Home row.
export function BacklogRow({ items }: { items: readonly HomeBacklogItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-backlog" className="flex flex-col gap-3">
      <h2 id="home-backlog" className="text-lg font-medium tracking-tight">
        From your Backlog
      </h2>
      <MediaRowScroller>
        {items.map((item) => (
          <BacklogTile key={`${item.mediaType}-${item.mediaProviderId}`} item={item} />
        ))}
      </MediaRowScroller>
    </section>
  );
}
