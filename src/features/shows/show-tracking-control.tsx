"use client";

import { MoreHorizontal } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Progress } from "@/components/ui/progress";
import {
  clearShowTrackingStateAction,
  dropShowAction,
  putShowOnHoldAction,
  resetShowProgressAction,
  startWatchingShowAction,
} from "@/features/shows/show-tracking-actions";
import { showViewingStateLabel } from "@/features/shows/show-viewing-state-label";
import type { ShowProgress, ShowTrackingStatus } from "@/server/tracking/types";

// Show Details' one personal-status control — a compact label + optional
// progress figure + a small secondary menu, never several competing
// buttons/badges (see docs/tracking.md and CLAUDE.md, "Tracking"). The
// personal status label here is deliberately separate from — and reads
// nothing like — ShowHero's own provider-status text (e.g. "Returning
// Series"): different concepts, different places on the page.
export function ShowTrackingControl({
  showProviderId,
  explicitState,
  progress,
}: {
  showProviderId: number;
  explicitState: ShowTrackingStatus | null;
  progress: ShowProgress;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  function startWatching() {
    startTransition(async () => {
      await startWatchingShowAction(showProviderId);
    });
  }

  function putOnHold() {
    startTransition(async () => {
      await putShowOnHoldAction(showProviderId);
    });
  }

  function drop() {
    startTransition(async () => {
      await dropShowAction(showProviderId);
    });
  }

  function clearState() {
    startTransition(async () => {
      await clearShowTrackingStateAction(showProviderId);
    });
  }

  function resetProgress() {
    startTransition(async () => {
      await resetShowProgressAction(showProviderId);
      setConfirmResetOpen(false);
    });
  }

  const notStarted = explicitState === null && progress.derivedViewingState === "unwatched";

  if (notStarted) {
    return (
      <Button onClick={startWatching} loading={isPending}>
        Start watching
      </Button>
    );
  }

  const label = showViewingStateLabel(explicitState, progress.derivedViewingState);
  const hasProgress = progress.uniqueWatchedAiredEpisodeCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>

      {progress.airedEpisodeCount > 0 ? (
        <div className="flex items-center gap-2">
          <Progress value={progress.completionRatio * 100} className="w-24" />
          <span className="text-xs text-muted-foreground">
            {progress.uniqueWatchedAiredEpisodeCount} of {progress.airedEpisodeCount} episodes
          </span>
        </div>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton aria-label="Tracking options" variant="ghost" disabled={isPending}>
            <MoreHorizontal />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {explicitState === "on_hold" || explicitState === "dropped" ? (
            <DropdownMenuItem onSelect={startWatching}>Resume watching</DropdownMenuItem>
          ) : null}
          {explicitState !== "on_hold" ? (
            <DropdownMenuItem onSelect={putOnHold}>On hold</DropdownMenuItem>
          ) : null}
          {explicitState !== "dropped" ? (
            <DropdownMenuItem onSelect={drop}>Dropped</DropdownMenuItem>
          ) : null}
          {hasProgress ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmResetOpen(true)}>
                Reset progress
              </DropdownMenuItem>
            </>
          ) : null}
          {explicitState !== null ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={clearState}>Stop tracking</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resetting progress deletes real watch history — a confirmation
          step, unlike every other control here (see docs/tracking.md,
          "Watch history is critical, user-owned data"). */}
      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset progress?</DialogTitle>
            <DialogDescription>
              This removes every watched episode for this show, back to unwatched. This can&apos;t
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={resetProgress} loading={isPending}>
              Reset progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
