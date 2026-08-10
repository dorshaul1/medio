"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  markSeasonWatchedAction,
  unmarkSeasonWatchedAction,
} from "@/features/shows/show-tracking-actions";

// The season page's one bulk action, alongside `SeasonProgress` — marking
// every remaining aired episode watched at once, for a season the user is
// simply catching up on rather than tracking episode by episode. Purely
// additive, so — like every other "mark watched" control in this product
// — it commits immediately with no confirmation.
//
// Once the season is fully watched, the same control becomes a quiet
// secondary "Season watched" pill (the same visual language as
// `MovieTrackingControl`'s watched state), whose only action is the
// reverse: unmark the whole season. That direction genuinely deletes real
// watch history in bulk — the same class of action as Show Details' own
// "Reset progress" — so it requires the same confirmation step before it
// runs (see CLAUDE.md, "Tracking" and docs/tracking.md).
export function SeasonWatchControl({
  showProviderId,
  seasonNumber,
  airedEpisodes,
  airedCount,
  watchedCount,
}: {
  showProviderId: number;
  seasonNumber: number;
  // Only the aired episodes of this season — the same set `airedCount`
  // is computed from on the season page — so a bulk mark never reaches
  // for an episode that hasn't released yet.
  airedEpisodes: readonly { episodeNumber: number; episodeProviderId: number }[];
  airedCount: number;
  watchedCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmUnmarkOpen, setConfirmUnmarkOpen] = useState(false);

  if (airedCount === 0) return null;

  function markAllWatched() {
    startTransition(async () => {
      await markSeasonWatchedAction({ showProviderId, seasonNumber, episodes: airedEpisodes });
    });
  }

  function unmarkAll() {
    startTransition(async () => {
      await unmarkSeasonWatchedAction({ showProviderId, seasonNumber });
      setConfirmUnmarkOpen(false);
    });
  }

  if (watchedCount < airedCount) {
    return (
      <Button variant="outline" onClick={markAllWatched} loading={isPending}>
        Mark season watched
      </Button>
    );
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setConfirmUnmarkOpen(true)}>
        <Check />
        Season watched
      </Button>
      <Dialog open={confirmUnmarkOpen} onOpenChange={setConfirmUnmarkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark season unwatched?</DialogTitle>
            <DialogDescription>
              This removes every watched episode in this season, back to unwatched. This can&apos;t
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnmarkOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={unmarkAll} loading={isPending}>
              Mark season unwatched
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
