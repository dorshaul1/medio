import { TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { mediaHref } from "@/features/media/media-route";
import type { DiaryEntry, UnavailableDiaryEntry } from "@/server/diary/types";
import { DiaryEntryMenu } from "./diary-entry-menu";
import { DiaryEpisodeEntry } from "./diary-episode-entry";
import { DiaryMovieEntry } from "./diary-movie-entry";

// The one degraded row shape — provider hydration failed for this real
// event (a live TMDB error, or the title having since become
// unavailable), so no title/artwork is fabricated for it (see
// docs/diary.md, "Provider failure"). Still a real link (the identity is
// real even when hydration isn't) and still gets the same Edit/Delete
// menu as every other entry — the event is real user history regardless
// of whether TMDB can currently describe it.
function DiaryUnavailableEntry({ entry }: { entry: UnavailableDiaryEntry }) {
  const href: Route =
    entry.eventType === "movie"
      ? mediaHref({ mediaType: "movie", id: entry.movieProviderId })
      : (`/shows/${entry.showProviderId}/seasons/${entry.seasonNumber}#episode-${entry.episodeNumber}` as Route);

  return (
    <li className="flex items-center gap-3 py-2.5 [[data-density=compact]_&]:py-1.5">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div
          className={
            entry.eventType === "movie"
              ? "flex aspect-2/3 w-12 shrink-0 items-center justify-center rounded-md bg-surface-subtle sm:w-14"
              : "flex aspect-video w-20 shrink-0 items-center justify-center rounded-md bg-surface-subtle sm:w-24"
          }
        >
          <TriangleAlert
            aria-hidden="true"
            strokeWidth={1.25}
            className="size-5 text-muted-foreground/50"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-medium text-muted-foreground">Title unavailable</p>
          <p className="text-xs text-muted-foreground">
            {entry.eventType === "movie" ? "Movie" : "Episode"}
          </p>
        </div>
      </Link>

      <DiaryEntryMenu
        target={
          entry.eventType === "movie"
            ? {
                eventType: "movie",
                id: entry.id,
                movieProviderId: entry.movieProviderId,
                watchedAt: entry.watchedAt,
              }
            : {
                eventType: "episode",
                id: entry.id,
                showProviderId: entry.showProviderId,
                seasonNumber: entry.seasonNumber,
                watchedAt: entry.watchedAt,
              }
        }
        accessibleName="this viewing"
      />
    </li>
  );
}

// The one dispatch point from a normalized `DiaryEntry` to its concrete
// row composition — a discriminated switch over `kind`, not one
// prop-monster row (see docs/diary.md, "Unified history read model").
export function DiaryEntryRow({ entry }: { entry: DiaryEntry }) {
  switch (entry.kind) {
    case "movie":
      return <DiaryMovieEntry entry={entry} />;
    case "episode":
      return <DiaryEpisodeEntry entry={entry} />;
    case "unavailable":
      return <DiaryUnavailableEntry entry={entry} />;
  }
}
