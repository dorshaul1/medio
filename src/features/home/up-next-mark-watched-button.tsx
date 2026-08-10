"use client";

import { CheckCircle2 } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markEpisodeWatchedAction } from "@/features/shows/show-tracking-actions";

// Up Next's one secondary action — the same shared episode action every
// other episode control uses (features/shows/show-tracking-actions.ts),
// not a bespoke Up-Next-only mutation: episode tracking is a plain
// watched toggle everywhere in this product, with no rewatch count, no
// history menu, and no "Undo" (see CLAUDE.md, "Tracking"). Marking
// watched here revalidates Home immediately, which replaces this exact
// card with whatever Up Next becomes next via the parent's
// episode-identity `key` (personalized-home-sections.tsx) — that remount
// is what plays the new card's own entrance animation
// (up-next-card.tsx). This component's only job is to bridge the brief
// real network round trip in between: a full-card scrim with a single
// centered clay checkmark (the product's one signature accent — see
// CLAUDE.md, "Visual system") so the transition reads as one deliberate
// motion — mark, then jump to the next episode — rather than a spinner
// followed by an unexplained swap. No visible label: the mark itself is
// the message; `role="status"`/`aria-label` carries the same "Watched"
// announcement to assistive tech instead.
export function UpNextMarkWatchedButton({
  showProviderId,
  seasonNumber,
  episodeNumber,
  episodeProviderId,
}: {
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
}) {
  const [isPending, startTransition] = useTransition();

  function markWatched() {
    startTransition(async () => {
      await markEpisodeWatchedAction({
        showProviderId,
        seasonNumber,
        episodeNumber,
        episodeProviderId,
      });
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={markWatched}>
        Mark watched
      </Button>
      {isPending ? (
        <div
          role="status"
          aria-label="Watched"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-[watched-flash-overlay-in_180ms_ease-out]"
        >
          <CheckCircle2
            aria-hidden
            className="size-12 text-primary animate-[watched-flash-check-pop_280ms_cubic-bezier(0.34,1.56,0.64,1)]"
          />
        </div>
      ) : null}
    </>
  );
}
