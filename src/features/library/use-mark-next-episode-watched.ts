"use client";

import { useState, useTransition } from "react";
import { markEpisodeWatchedAction } from "@/features/shows/show-tracking-actions";
import type { TrackedShowLibraryItem } from "@/server/library/types";

// The one canonical way Library marks an active show's next episode
// watched — shared by the desktop/checkbox `IconButton`
// (`LibraryShowQuickAction`) and the mobile swipe row
// (`EpisodeSwipeRow`), so neither ever becomes a second tracking
// implementation (see docs/library.md, "Mobile episode controls"). Calls
// the exact same `markEpisodeWatchedAction` every other episode control
// in the app calls. `commit()` resolves to whether it actually
// succeeded so a caller with its own visual commit state (the swipe
// row's reveal animation) can roll itself back on failure — this hook
// itself has no opinion on presentation.
export function useMarkNextEpisodeWatched(item: TrackedShowLibraryItem) {
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const nextEpisode = item.nextEpisode;

  function commit(): Promise<boolean> {
    if (!nextEpisode) return Promise.resolve(false);
    setFailed(false);
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          await markEpisodeWatchedAction({
            showProviderId: item.mediaProviderId,
            seasonNumber: nextEpisode.seasonNumber,
            episodeNumber: nextEpisode.episodeNumber,
            episodeProviderId: nextEpisode.episodeProviderId,
          });
          resolve(true);
        } catch {
          setFailed(true);
          resolve(false);
        }
      });
    });
  }

  return { commit, isPending, failed, nextEpisode };
}
