import { CheckCircle2 } from "lucide-react";
import { markEpisodeWatchedAction } from "@/features/shows/show-tracking-actions";
import type { ActiveShowContinuation } from "@/server/home/types";
import type { Command } from "./types";

// Turns Home's own canonical Up Next fact into one Command — the exact
// same episode mutation every other episode control uses
// (`markEpisodeWatchedAction`, see CLAUDE.md, "Tracking"), never a
// parallel tracking write. `onDone` lets the dialog show a brief
// confirmation and refresh dynamic commands (Up Next itself changes once
// this runs) without the command needing to know about dialog UI state.
export function buildUpNextCommand(upNext: ActiveShowContinuation, onDone: () => void): Command {
  return {
    id: "action-mark-up-next-watched",
    label: `Mark ${upNext.title} S${upNext.nextEpisode.seasonNumber} E${upNext.nextEpisode.episodeNumber} watched`,
    group: "quick-actions",
    icon: CheckCircle2,
    keywords: ["up next", "watched", "continue"],
    run: async () => {
      await markEpisodeWatchedAction({
        showProviderId: upNext.showProviderId,
        seasonNumber: upNext.nextEpisode.seasonNumber,
        episodeNumber: upNext.nextEpisode.episodeNumber,
        episodeProviderId: upNext.nextEpisode.episodeProviderId,
      });
      onDone();
    },
  };
}
