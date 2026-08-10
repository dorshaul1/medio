import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarEpisodeEventRow } from "@/features/calendar/calendar-episode-event-row";
import { relevanceLabel } from "@/features/calendar/event-copy";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { formatReleaseDate } from "@/server/calendar/date";
import type { ReleaseEvent } from "@/server/calendar/types";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";
import { posterUrl } from "@/server/tmdb/images";

// One release event, one row — the temporal-agenda equivalent of
// `LibraryItemRow`/`DiaryEpisodeEntry`, deliberately its own composition
// (see CLAUDE.md, "Media presentation is context-specific"): a show's
// own identity always leads (Calendar mixes many shows/movies in one
// list), and the trailing quick action only ever appears for an aired
// episode from a show the user is actually tracking (see
// docs/calendar.md, "Quick tracking"). Movie events need no client
// interactivity at all (no spoiler concern, no quick action — see
// CLAUDE.md, "Spoiler protection is a TV-episode-progression concept
// only"), so only the episode branch is a Client Component.
export function CalendarEventRow({
  event,
  now,
  useLocalTimezone,
  spoilerProtection,
}: {
  event: ReleaseEvent;
  now: Date;
  useLocalTimezone: boolean;
  spoilerProtection: SpoilerProtectionValue;
}) {
  if (event.kind === "episode") {
    return (
      <CalendarEpisodeEventRow
        event={event}
        now={now}
        useLocalTimezone={useLocalTimezone}
        spoilerProtection={spoilerProtection}
      />
    );
  }

  const dateLabel = formatReleaseDate(event.date, now, useLocalTimezone);
  const relevance = relevanceLabel(event.relevance);
  const poster = posterUrl(event.poster, "small");

  return (
    <li className="flex items-center gap-3 py-2.5 [[data-density=compact]_&]:py-1.5">
      <Link
        href={`/movies/${event.movieProviderId}` as Route}
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
          <p className="line-clamp-1 text-sm font-medium text-foreground">{event.movieTitle}</p>
          <p className="text-xs text-muted-foreground">
            {relevance ? `${relevance} · ` : ""}
            {dateLabel}
          </p>
        </div>
      </Link>
    </li>
  );
}
