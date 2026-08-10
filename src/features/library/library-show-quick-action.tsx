"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  markEpisodeWatchedAction,
  startWatchingShowAction,
} from "@/features/shows/show-tracking-actions";
import { cn } from "@/lib/utils";
import type { TrackedShowLibraryItem } from "@/server/library/types";

// Library's highest-value convenience interaction: continuing an active
// Show without opening Show Details → Season → finding the episode (see
// docs/library.md, "Quick tracking"). Reuses the exact same tracking
// commands every other episode/status control calls — no parallel
// mutation path. Renders nothing for every other state (caught up,
// waiting, completed, dropped, never started): there's nothing
// actionable to offer, so no button, not a disabled one.
//
// The `watching` case is the same watch-ring control as episode tracking
// (features/shows/episode-watch-control.tsx) rather than a labeled
// button — this row's "mark watched" is the exact same concept as an
// episode row's, so it earns the same shape (see CLAUDE.md, "Frequent,
// clearly-recognizable actions ... use icon-first interactions"). It's
// one-directional here (nothing to unmark from Library — history
// correction stays on Show Details), so the ring fills the instant it's
// pressed and holds through the pending mutation; the row's own
// next-episode line (`LibraryItemDetail`) plays its own small entrance
// once the new episode actually arrives, keyed by episode identity.
// `on_hold`'s "Resume" has no obvious single icon (see CLAUDE.md,
// "domain-specific concepts without an obvious icon ... keep text"), so
// it stays a labeled button.
export function LibraryShowQuickAction({ item }: { item: TrackedShowLibraryItem }) {
  const [isPending, startTransition] = useTransition();
  const nextEpisode = item.nextEpisode;

  if (item.derivedState === "watching" && nextEpisode) {
    return (
      <IconButton
        aria-label={`Mark ${item.title} S${nextEpisode.seasonNumber} E${nextEpisode.episodeNumber} watched`}
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await markEpisodeWatchedAction({
              showProviderId: item.mediaProviderId,
              seasonNumber: nextEpisode.seasonNumber,
              episodeNumber: nextEpisode.episodeNumber,
              episodeProviderId: nextEpisode.episodeProviderId,
            });
          });
        }}
        className={cn(
          "rounded-full border text-background hover:bg-transparent [&_svg]:size-3.5",
          isPending
            ? "border-foreground bg-foreground hover:bg-foreground/85"
            : "border-muted-foreground/35 hover:border-foreground/60",
        )}
      >
        <Check className={cn("transition-opacity", !isPending && "opacity-0")} />
      </IconButton>
    );
  }

  if (item.derivedState === "on_hold") {
    return (
      <Button
        variant="outline"
        size="sm"
        loading={isPending}
        onClick={() => {
          startTransition(async () => {
            await startWatchingShowAction(item.mediaProviderId);
          });
        }}
      >
        Resume
      </Button>
    );
  }

  return null;
}
