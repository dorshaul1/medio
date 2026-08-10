import Image from "next/image";
import Link from "next/link";
import { formatDateTime } from "@/features/media/format-date";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { mediaHref } from "@/features/media/media-route";
import type { MovieDiaryEntry } from "@/server/diary/types";
import { posterUrl } from "@/server/tmdb/images";
import { DiaryEntryMenu } from "./diary-entry-menu";
import { ordinalWatchLabel } from "./diary-ordinal";

// A purpose-built Movie Diary row — compact poster, title, year, and
// rewatch context only. This is history being reviewed, not a title
// being rediscovered, so no overview/genres/rating/runtime — see
// docs/diary.md, "Movie entries". Poster geometry matches Library's own
// row (`aspect-2/3`), so a Diary and Library row read as the same
// product language even though the surrounding page is temporal, not
// state-oriented.
export function DiaryMovieEntry({ entry }: { entry: MovieDiaryEntry }) {
  const poster = posterUrl(entry.poster, "small");
  const href = mediaHref({ mediaType: "movie", id: entry.movieProviderId });
  const isRewatch = entry.ordinal > 1;

  return (
    <li className="flex items-center gap-3 py-2.5 [[data-density=compact]_&]:py-1.5">
      <Link
        href={href}
        title={formatDateTime(entry.watchedAt)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-14">
          {poster ? (
            <Image src={poster} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <MediaPosterFallback mediaType="movie" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{entry.title}</p>
          <p className="text-xs text-muted-foreground">
            {entry.year ?? "Movie"}
            {isRewatch ? ` · ${ordinalWatchLabel(entry.ordinal)}` : ""}
          </p>
        </div>
      </Link>

      <DiaryEntryMenu
        target={{
          eventType: "movie",
          id: entry.id,
          movieProviderId: entry.movieProviderId,
          watchedAt: entry.watchedAt,
        }}
        accessibleName={entry.title}
      />
    </li>
  );
}
