"use client";

import { MoreHorizontal } from "lucide-react";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import {
  changePlanningIntentAction,
  removePlanningItemAction,
} from "@/features/media/planning-actions";
import type { LibraryItem } from "@/server/library/types";

// Restrained secondary actions — only for planned items (move to the
// other list, remove). Watched movies and tracked shows don't get a menu
// here: detailed history correction belongs on the media's own Details
// page, not duplicated into the Library row (see docs/library.md,
// "Library item actions").
export function LibraryItemActions({ item }: { item: LibraryItem }) {
  const [isPending, startTransition] = useTransition();

  if (item.kind !== "planned-movie" && item.kind !== "planned-show") return null;

  const otherIntent = item.intent === "watchlist" ? "backlog" : "watchlist";
  const otherLabel = otherIntent === "watchlist" ? "Move to Watchlist" : "Move to Backlog";
  // "Remove" alone is ambiguous out of context (see docs/library.md,
  // "Microcopy") — a screen reader announcing this menu item gets no
  // other context from the row itself, so the list it's removing the
  // item from is named explicitly.
  const removeLabel = item.intent === "watchlist" ? "Remove from Watchlist" : "Remove from Backlog";

  function move() {
    startTransition(async () => {
      await changePlanningIntentAction(item.mediaType, item.mediaProviderId, otherIntent);
    });
  }

  function remove() {
    startTransition(async () => {
      await removePlanningItemAction(item.mediaType, item.mediaProviderId);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label={`More actions for ${item.title}`}
          variant="ghost"
          size="sm"
          disabled={isPending}
        >
          <MoreHorizontal />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={move}>{otherLabel}</DropdownMenuItem>
        <DropdownMenuItem onSelect={remove}>{removeLabel}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
