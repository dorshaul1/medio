"use client";

import { CheckCheck } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markShowWatchedAction } from "@/features/shows/show-tracking-actions";

// Show Details' whole-show bulk action, one level up from the per-season
// `SeasonWatchControl` — for a show the user is simply catching up on
// entirely rather than season by season. Purely additive (marks every
// remaining aired episode across every *regular* season watched,
// skipping already-watched ones), so — like every other "mark watched"
// control in this product — it commits immediately with no confirmation
// (see CLAUDE.md, "Tracking"). Specials (season 0) are intentionally
// left out; they have their own season page to mark separately. Hides
// itself once there's nothing left to catch up on, rather than showing a
// control with nothing to do.
export function MarkShowWatchedControl({
  showProviderId,
  episodes,
  remainingCount,
}: {
  showProviderId: number;
  episodes: readonly { seasonNumber: number; episodeNumber: number; episodeProviderId: number }[];
  remainingCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  if (remainingCount === 0) return null;

  function markAllWatched() {
    startTransition(async () => {
      await markShowWatchedAction({ showProviderId, episodes });
    });
  }

  return (
    <Button variant="outline" onClick={markAllWatched} loading={isPending}>
      <CheckCheck />
      Mark all watched
    </Button>
  );
}
