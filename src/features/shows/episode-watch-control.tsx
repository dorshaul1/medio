"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { formatDate } from "@/features/media/format-date";
import {
  markEpisodeWatchedAction,
  unmarkEpisodeWatchedAction,
} from "@/features/shows/show-tracking-actions";
import { cn } from "@/lib/utils";
import type { EpisodeWatchSummary } from "@/server/tracking/types";

// A restrained "watch ring", not a checkbox — an empty outline ring for
// unwatched, a filled ring for watched, the shape itself carrying the
// state rather than a swapped icon (see docs/tracking.md and CLAUDE.md,
// "Tracking"/"Visual system"). Deliberately neutral (foreground/
// background tokens), never Clay — this fires dozens of times per
// season, and Clay stays reserved for genuinely special moments, not
// every completed episode (see CLAUDE.md, "Clay is the signature
// accent, not a theme"). Episode tracking is a plain watched/unwatched
// toggle: clicking an unwatched episode marks it watched; clicking a
// watched episode unmarks it entirely — no rewatch count, no history
// menu, no separate "undo" (see `MovieTrackingControl` for the
// deliberately different, event-based movie equivalent).
export function EpisodeWatchControl({
  showProviderId,
  seasonNumber,
  episodeNumber,
  episodeProviderId,
  summary,
}: {
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  summary: EpisodeWatchSummary;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (summary.hasWatched) {
        await unmarkEpisodeWatchedAction({ episodeProviderId, showProviderId, seasonNumber });
      } else {
        await markEpisodeWatchedAction({
          showProviderId,
          seasonNumber,
          episodeNumber,
          episodeProviderId,
        });
      }
    });
  }

  const accessibleName = summary.hasWatched
    ? `Mark episode ${episodeNumber} as not watched`
    : `Mark episode ${episodeNumber} watched`;

  return (
    <IconButton
      aria-label={accessibleName}
      title={summary.lastWatchedAt ? `Watched ${formatDate(summary.lastWatchedAt)}` : undefined}
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "rounded-full border text-background hover:bg-transparent [&_svg]:size-3.5",
        summary.hasWatched
          ? "border-foreground bg-foreground hover:bg-foreground/85"
          : "border-muted-foreground/35 hover:border-foreground/60",
      )}
    >
      <Check className={cn("transition-opacity", !summary.hasWatched && "opacity-0")} />
    </IconButton>
  );
}
