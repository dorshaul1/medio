import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { MediaRowScroller } from "@/features/media/media-row-scroller";
import type { ActiveShowContinuation } from "@/server/home/types";
import { posterUrl } from "@/server/tmdb/images";

// A poster + compact progress strip + next-episode reference — more
// personal context than a Discover poster tile, but still far more
// compact than Show Details' own progress block (see docs/home.md,
// "Progress representation"). Reuses MediaRowScroller (the same native
// horizontal-scroll shell every other Home row uses) with a bespoke tile,
// not MediaPoster — Continue Watching needs progress/next-episode
// context a plain poster caption can't carry.
function ContinueWatchingTile({ item }: { item: ActiveShowContinuation }) {
  const poster = posterUrl(item.poster, "medium");
  const href =
    `/shows/${item.showProviderId}/seasons/${item.nextEpisode.seasonNumber}#episode-${item.nextEpisode.episodeNumber}` as Route;
  const ratio =
    item.airedEpisodeCount > 0 ? (item.watchedEpisodeCount / item.airedEpisodeCount) * 100 : 0;

  return (
    <Link
      href={href}
      aria-label={`Continue ${item.title}, season ${item.nextEpisode.seasonNumber} episode ${item.nextEpisode.episodeNumber}`}
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
          <MediaPosterFallback mediaType="show" />
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          S{item.nextEpisode.seasonNumber} E{item.nextEpisode.episodeNumber}
        </p>
        <Progress value={ratio} className="h-1" />
      </div>
    </Link>
  );
}

export function ContinueWatchingRow({ items }: { items: readonly ActiveShowContinuation[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-continue-watching" className="flex flex-col gap-3">
      <h2 id="home-continue-watching" className="text-lg font-medium tracking-tight">
        Continue Watching
      </h2>
      <MediaRowScroller>
        {items.map((item) => (
          <ContinueWatchingTile key={item.showProviderId} item={item} />
        ))}
      </MediaRowScroller>
    </section>
  );
}
