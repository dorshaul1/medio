import { Tv } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatDateTime } from "@/features/media/format-date";
import type { EpisodeDiaryEntry } from "@/server/diary/types";
import { stillUrl } from "@/server/tmdb/images";
import { DiaryEntryMenu } from "./diary-entry-menu";
import { ordinalWatchLabel } from "./diary-ordinal";

// A purpose-built Episode Diary row — identifies both the Show and the
// specific Episode, in that hierarchy (show title quiet/secondary,
// `S2 E4 · Episode Title` as the primary line), using the episode's own
// still rather than the show's poster: the still is what actually
// differentiates one viewing from the next when a show contributes many
// rows to the same timeline, and — since Diary only ever shows episodes
// the user has already watched — surfacing it here is never a spoiler
// (see docs/diary.md, "Spoiler safety"). Same still + `Tv` fallback
// treatment as `EpisodeRow` on the Season page, for one consistent
// "this is an episode" visual language across the app.
export function DiaryEpisodeEntry({ entry }: { entry: EpisodeDiaryEntry }) {
  const still = stillUrl(entry.episodeStill);
  const href =
    `/shows/${entry.showProviderId}/seasons/${entry.seasonNumber}#episode-${entry.episodeNumber}` as Route;
  const coordinate = `S${entry.seasonNumber} E${entry.episodeNumber}`;
  const isRewatch = entry.ordinal > 1;

  return (
    <li className="flex items-center gap-3 py-2.5 [[data-density=compact]_&]:py-1.5">
      <Link
        href={href}
        title={formatDateTime(entry.watchedAt)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-24">
          {still ? (
            <Image src={still} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Tv
                aria-hidden="true"
                strokeWidth={1.25}
                className="size-5 text-muted-foreground/60"
              />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="line-clamp-1 text-xs text-muted-foreground">{entry.showTitle}</p>
          <p className="line-clamp-1 text-sm font-medium text-foreground">
            {coordinate} · {entry.episodeTitle}
          </p>
          {isRewatch ? (
            <p className="text-xs text-muted-foreground">{ordinalWatchLabel(entry.ordinal)}</p>
          ) : null}
        </div>
      </Link>

      <DiaryEntryMenu
        target={{
          eventType: "episode",
          id: entry.id,
          showProviderId: entry.showProviderId,
          seasonNumber: entry.seasonNumber,
          watchedAt: entry.watchedAt,
        }}
        accessibleName={`${entry.showTitle}, ${coordinate}`}
      />
    </li>
  );
}
