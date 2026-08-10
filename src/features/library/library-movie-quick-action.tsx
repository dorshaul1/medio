"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { markMovieWatchedAction } from "@/features/movies/movie-tracking-actions";
import { cn } from "@/lib/utils";
import type { PlannedMovieLibraryItem } from "@/server/library/types";

// A planned (Watchlist/Backlog) movie's likely next action, right in the
// row — no detour through Movie Details for the single most common thing
// to do with a saved movie (see docs/library.md, "Quick tracking"). The
// same watch-ring control as episode tracking
// (features/shows/episode-watch-control.tsx), per CLAUDE.md's "Frequent,
// clearly-recognizable actions ... use icon-first interactions rather
// than repeated styled text buttons" — a checkmark reads as "mark
// watched" without repeating the words in every row. One-directional
// here (there's nothing to unmark from Library — history correction
// stays on Movie Details), so the ring fills the instant it's pressed and
// holds through the pending mutation; marking it watched also clears the
// planning entry, so the row naturally leaves this quick action on the
// next render.
export function LibraryMovieQuickAction({ item }: { item: PlannedMovieLibraryItem }) {
  const [isPending, startTransition] = useTransition();

  return (
    <IconButton
      aria-label={`Mark ${item.title} watched`}
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await markMovieWatchedAction(item.mediaProviderId);
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
