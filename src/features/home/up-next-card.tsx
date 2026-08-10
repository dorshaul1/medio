import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UpNextMarkWatchedButton } from "@/features/home/up-next-mark-watched-button";
import { pluralize } from "@/features/shows/pluralize";
import type { ActiveShowContinuation } from "@/server/home/types";
import { backdropUrl, posterUrl } from "@/server/tmdb/images";

// Home's single strongest personal recommendation — a purpose-built,
// full-bleed-artwork composition (same visual language as
// `features/movies/part-of-collection-row.tsx`'s collection card: real
// artwork as the background, a fixed dark scrim, fixed white text — not a
// theme-token card, since it floats over unpredictable show artwork in
// either app theme), not a generic poster-row item. Deliberately no
// playback language ("Play"/"Resume") — this application tracks media, it
// doesn't stream it (see docs/home.md, "No fake playback"). Uses the
// show's own backdrop/poster, never the next episode's still or overview
// — spoiler safety (see docs/home.md, "Spoiler safety").
//
// The `animate-[up-next-enter_...]` class plays once per mount — the
// caller keys this component by episode identity (see
// personalized-home-sections.tsx) specifically so advancing to a new
// episode remounts it and the transition actually plays, rather than
// React quietly diffing the text/art in place with no visual change at
// all.
export function UpNextCard({ item }: { item: ActiveShowContinuation }) {
  const art = backdropUrl(item.backdrop, "large") ?? posterUrl(item.poster, "large");
  const episodeHref =
    `/shows/${item.showProviderId}/seasons/${item.nextEpisode.seasonNumber}#episode-${item.nextEpisode.episodeNumber}` as Route;
  const episodeCoordinate = `S${item.nextEpisode.seasonNumber} E${item.nextEpisode.episodeNumber}`;

  return (
    <section
      aria-labelledby="home-up-next"
      className="relative overflow-hidden rounded-lg border border-border animate-[up-next-enter_260ms_cubic-bezier(0.16,1,0.3,1)]"
    >
      {art ? (
        <>
          <Image
            src={art}
            alt=""
            fill
            sizes="(min-width: 1024px) 900px, 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/72" />
        </>
      ) : (
        <div className="absolute inset-0 bg-surface-subtle" />
      )}

      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        <p
          className={`text-xs font-medium tracking-wide uppercase ${art ? "text-white/75" : "text-muted-foreground"}`}
        >
          Up Next
        </p>

        <div className="flex flex-col gap-1">
          <h2
            id="home-up-next"
            className={`text-xl font-medium tracking-tight text-balance sm:text-2xl ${art ? "text-white" : "text-foreground"}`}
          >
            {item.title}
          </h2>
          <p className={`text-sm ${art ? "text-white/85" : "text-foreground/85"}`}>
            {episodeCoordinate} · {item.nextEpisode.title}
          </p>
          <p className={`text-xs ${art ? "text-white/60" : "text-muted-foreground"}`}>
            {pluralize(item.remainingAiredEpisodeCount, "episode")} remaining
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button asChild>
            <Link
              href={episodeHref}
              aria-label={`Open ${item.title}, ${episodeCoordinate}, ${item.nextEpisode.title}`}
            >
              Open episode
            </Link>
          </Button>
          <UpNextMarkWatchedButton
            showProviderId={item.showProviderId}
            seasonNumber={item.nextEpisode.seasonNumber}
            episodeNumber={item.nextEpisode.episodeNumber}
            episodeProviderId={item.nextEpisode.episodeProviderId}
          />
        </div>
      </div>
    </section>
  );
}
