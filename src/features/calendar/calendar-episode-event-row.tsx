"use client";

import { Eye, Tv } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { episodeCoordinateLabel, relevanceLabel } from "@/features/calendar/event-copy";
import { EpisodeWatchControl } from "@/features/shows/episode-watch-control";
import { formatReleaseDate } from "@/server/calendar/date";
import type { EpisodeReleaseEvent } from "@/server/calendar/types";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";
import { resolveEpisodeSpoilerDecision } from "@/server/spoilers/policy";
import { stillUrl } from "@/server/tmdb/images";
import type { EpisodeWatchSummary } from "@/server/tracking/types";

// Every episode event Calendar renders is, by construction, either not
// yet aired or is exactly the show's own next-unwatched-aired episode
// (see server/calendar/compose.ts) — never something the user has
// already watched. A real per-episode summary fetch would be redundant.
const UNWATCHED: EpisodeWatchSummary = { hasWatched: false, watchCount: 0, lastWatchedAt: null };

// A whole client component (not just a spoiler-reveal leaf) because the
// row's own navigation `Link` and its reveal button/quick-tracking
// control must never nest one interactive element inside another (an
// anchor containing a `<button>` is invalid, inaccessible markup) — they
// have to render as siblings sharing this one `revealed` state, so the
// split has to happen at this level rather than inside a smaller
// presentational child (see docs/calendar.md, "Spoiler protection").
export function CalendarEpisodeEventRow({
  event,
  now,
  useLocalTimezone,
  spoilerProtection,
}: {
  event: EpisodeReleaseEvent;
  now: Date;
  useLocalTimezone: boolean;
  spoilerProtection: SpoilerProtectionValue;
}) {
  const [revealed, setRevealed] = useState(false);
  const decision = resolveEpisodeSpoilerDecision({ protection: spoilerProtection, watched: false });
  const hideIdentity = decision.hideIdentity && !revealed;

  const dateLabel = formatReleaseDate(event.date, now, useLocalTimezone);
  const relevance = relevanceLabel(event.relevance);
  const isNewEpisode = event.relevance === "activeShow" && event.hasAired;
  const coordinate = episodeCoordinateLabel(event);
  const still = hideIdentity ? null : stillUrl(event.still);
  const href =
    `/shows/${event.showProviderId}/seasons/${event.seasonNumber}#episode-${event.episodeNumber}` as Route;

  return (
    <li className="flex items-center gap-3 py-2.5 [[data-density=compact]_&]:py-1.5">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-20">
          {still ? (
            <Image src={still} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Tv
                aria-hidden="true"
                strokeWidth={1.25}
                className="size-4 text-muted-foreground/60"
              />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{event.showTitle}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {isNewEpisode ? <span className="text-primary">New · </span> : null}
            {relevance ? `${relevance} · ` : ""}
            {coordinate} · {dateLabel}
          </p>
        </div>
      </Link>

      {hideIdentity ? (
        <IconButton
          aria-label={`Show details for ${event.showTitle} episode ${event.episodeNumber}`}
          variant="ghost"
          size="sm"
          onClick={() => setRevealed(true)}
        >
          <Eye />
        </IconButton>
      ) : null}

      {isNewEpisode ? (
        <EpisodeWatchControl
          showProviderId={event.showProviderId}
          seasonNumber={event.seasonNumber}
          episodeNumber={event.episodeNumber}
          episodeProviderId={event.episodeProviderId}
          summary={UNWATCHED}
        />
      ) : null}
    </li>
  );
}
