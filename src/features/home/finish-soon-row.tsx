import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { MediaRowScroller } from "@/features/media/media-row-scroller";
import { pluralize } from "@/features/shows/pluralize";
import type { ActiveShowContinuation } from "@/server/home/types";
import { posterUrl } from "@/server/tmdb/images";

// Smaller tiles than Continue Watching — a deliberately more compact
// treatment (see docs/home.md, "Finish Soon") so it reads as a quick
// nudge, not another full browsing row. Plain "N episodes left" copy, no
// urgency styling (no red/orange, no countdown, no "Almost there!").
function FinishSoonTile({ item }: { item: ActiveShowContinuation }) {
  const poster = posterUrl(item.poster, "small");
  const href =
    `/shows/${item.showProviderId}/seasons/${item.nextEpisode.seasonNumber}#episode-${item.nextEpisode.episodeNumber}` as Route;

  return (
    <Link
      href={href}
      aria-label={`Finish ${item.title} — ${pluralize(item.remainingAiredEpisodeCount, "episode")} left`}
      className="group block w-24 shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-28"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-surface-subtle">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="112px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          />
        ) : (
          <MediaPosterFallback mediaType="show" />
        )}
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5">
        <p className="line-clamp-1 text-xs font-medium text-foreground">{item.title}</p>
        <p className="text-[0.6875rem] text-muted-foreground">
          {pluralize(item.remainingAiredEpisodeCount, "episode")} left
        </p>
      </div>
    </Link>
  );
}

export function FinishSoonRow({ items }: { items: readonly ActiveShowContinuation[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-finish-soon" className="flex flex-col gap-3">
      <h2 id="home-finish-soon" className="text-lg font-medium tracking-tight">
        Finish Soon
      </h2>
      <MediaRowScroller>
        {items.map((item) => (
          <FinishSoonTile key={item.showProviderId} item={item} />
        ))}
      </MediaRowScroller>
    </section>
  );
}
