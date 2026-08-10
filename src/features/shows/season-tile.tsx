import { Layers } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { pluralize } from "@/features/shows/pluralize";
import type { SeasonSummary } from "@/server/media/types";
import { posterUrl } from "@/server/tmdb/images";

// A real link, not modal/JS-driven selection — season navigation must
// work without client JavaScript (see docs/architecture.md). Deliberately
// its own composition, not MediaPoster: seasons link to a different route
// shape and caption episode count/air year instead of a year alone.
export function SeasonTile({ showId, season }: { showId: number; season: SeasonSummary }) {
  const poster = posterUrl(season.poster, "medium");
  const airYear = season.airDate ? season.airDate.slice(0, 4) : null;

  return (
    <Link
      href={`/shows/${showId}/seasons/${season.seasonNumber}` as Route}
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
          <div className="flex h-full w-full items-center justify-center bg-surface-subtle">
            <Layers
              aria-hidden="true"
              strokeWidth={1.25}
              className="size-8 text-muted-foreground/60"
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{season.title}</p>
        <p className="text-xs text-muted-foreground transition-colors group-hover:text-foreground/80 group-focus-visible:text-foreground/80">
          {airYear ? `${airYear} · ` : ""}
          {pluralize(season.episodeCount, "episode")}
        </p>
      </div>
    </Link>
  );
}
