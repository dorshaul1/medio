"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { startWatchingShowAction } from "@/features/shows/show-tracking-actions";
import { cn } from "@/lib/utils";
import { useMarkNextEpisodeWatched } from "./use-mark-next-episode-watched";
import type { TrackedShowLibraryItem } from "@/server/library/types";

// Library's highest-value convenience interaction: continuing an active
// Show without opening Show Details → Season → finding the episode (see
// docs/library.md, "Quick tracking"). Renders nothing for every other
// state (caught up, waiting, completed, dropped, never started): there's
// nothing actionable to offer, so no button, not a disabled one.
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
//
// Desktop-only presentation of the exact same mutation mobile's swipe
// row (`EpisodeSwipeRow`) also calls — see `useMarkNextEpisodeWatched`.
// Mobile hides/shows this same control based on the user's "Mobile
// episode controls" preference (`LibraryEpisodeMobileControl`); this
// component itself doesn't know or care which breakpoint rendered it.
export function LibraryShowQuickAction({
  item,
  className,
}: {
  item: TrackedShowLibraryItem;
  className?: string;
}) {
  const { commit, isPending, nextEpisode } = useMarkNextEpisodeWatched(item);
  const [isResumePending, startResumeTransition] = useTransition();

  if (item.derivedState === "watching" && nextEpisode) {
    return (
      <IconButton
        aria-label={`Mark ${item.title} S${nextEpisode.seasonNumber} E${nextEpisode.episodeNumber} watched`}
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => void commit()}
        className={cn(
          "rounded-full border text-background hover:bg-transparent [&_svg]:size-3.5",
          isPending
            ? "border-foreground bg-foreground hover:bg-foreground/85"
            : "border-muted-foreground/35 hover:border-foreground/60",
          className,
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
        loading={isResumePending}
        onClick={() => {
          startResumeTransition(async () => {
            await startWatchingShowAction(item.mediaProviderId);
          });
        }}
        className={className}
      >
        Resume
      </Button>
    );
  }

  return null;
}
