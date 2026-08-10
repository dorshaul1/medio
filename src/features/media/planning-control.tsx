"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  changePlanningIntentAction,
  removePlanningItemAction,
} from "@/features/media/planning-actions";
import type { MediaType } from "@/server/media/types";
import type { PlanningIntent } from "@/server/planning/types";

// Movie/Show Details' one planning interaction — only ever shown for
// media that hasn't actually started being consumed yet (an unwatched
// movie; a show with no tracking state), so this never contradicts an
// active Tracking control (see docs/library.md, "Planning controls").
//
// Deliberately two different behaviors behind one control, not a
// dropdown-always trigger: unsaved, a single click saves straight to
// Watchlist — the lighter-weight of the two intents (see
// docs/library.md) — with no menu in the way. That state is a bare icon,
// not a bordered/filled Button — "save" is one of the most universally
// recognized icon actions there is, and it isn't the page's primary
// action (Mark watched/Continue is), so it doesn't need button chrome to
// be found. Once saved, the same control becomes the entry point to the
// secondary choice (switch to Backlog, or remove) — "click the current
// save state to manage it" — and picks up a visible text label there on
// purpose: "Watchlist" vs. "Backlog" is real information the icon alone
// can't carry, so that state stays icon + text, just without a solid
// permanent fill (`ghost`, not `secondary`).
export function PlanningControl({
  mediaType,
  mediaProviderId,
  intent,
  title,
  defaultIntent,
}: {
  mediaType: MediaType;
  mediaProviderId: number;
  intent: PlanningIntent | null;
  // Only consumed for the unsaved state's accessible name — once saved,
  // the trigger's own visible text ("Watchlist"/"Backlog") is already a
  // sufficient accessible name for a single per-page control.
  title: string;
  // Where the one-click unsaved-state Save action lands — the "Default
  // Save destination" preference (see docs/settings.md); the secondary
  // dropdown below always still offers switching to the other intent.
  defaultIntent: PlanningIntent;
}) {
  const [isPending, startTransition] = useTransition();

  function save(newIntent: PlanningIntent) {
    startTransition(async () => {
      await changePlanningIntentAction(mediaType, mediaProviderId, newIntent);
    });
  }

  function remove() {
    startTransition(async () => {
      await removePlanningItemAction(mediaType, mediaProviderId);
    });
  }

  if (intent === null) {
    const defaultLabel = defaultIntent === "watchlist" ? "Watchlist" : "Backlog";
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton
            aria-label={`Save ${title} to ${defaultLabel}`}
            variant="ghost"
            onClick={() => save(defaultIntent)}
            disabled={isPending}
          >
            <Bookmark />
          </IconButton>
        </TooltipTrigger>
        <TooltipContent>Save to {defaultLabel}</TooltipContent>
      </Tooltip>
    );
  }

  const label = intent === "watchlist" ? "Watchlist" : "Backlog";
  const otherIntent = intent === "watchlist" ? "backlog" : "watchlist";
  const otherLabel = intent === "watchlist" ? "Backlog" : "Watchlist";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" disabled={isPending}>
          <BookmarkCheck />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => save(otherIntent)}>
          <span className="flex flex-col">
            <span>Move to {otherLabel}</span>
            <span className="text-xs text-muted-foreground">
              {otherIntent === "watchlist" ? "Saved for later" : "Planning to watch"}
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={remove}>Remove from {label}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
