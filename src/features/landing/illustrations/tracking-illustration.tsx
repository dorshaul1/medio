"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { DEMO_SHOW_CURRENT } from "@/features/landing/demo-content";
import { cn } from "@/lib/utils";

type EpisodeState = "watched" | "next" | "upcoming";

// "MEDIO remembers exactly which episode comes next" — demonstrated, not
// just described: marking the highlighted episode watched genuinely
// advances the season (see CLAUDE.md, "Landing" — a tiny interactive
// demo, not a passive illustration). Demo-only local state; nothing here
// ever reaches the real tracking domain. Bounded to the season's real
// episode count — reaching the end shows an honest "Caught up," the same
// derived state the real product uses, never inventing a fake infinite
// season.
export function TrackingIllustration() {
  const { title, season, seasonEpisodeCount } = DEMO_SHOW_CURRENT;
  const [lastWatched, setLastWatched] = useState<number>(DEMO_SHOW_CURRENT.lastWatchedEpisode);

  const nextEpisode = lastWatched + 1;
  const caughtUp = nextEpisode > seasonEpisodeCount;
  const rows = [lastWatched - 1, lastWatched, nextEpisode, nextEpisode + 1]
    .filter((number) => number >= 1 && number <= seasonEpisodeCount)
    .map((number) => ({
      number,
      state: (number <= lastWatched
        ? "watched"
        : number === nextEpisode
          ? "next"
          : "upcoming") as EpisodeState,
    }));

  return (
    <div className="w-full max-w-xs sm:max-w-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title} · Season {season}
      </p>
      <div className="mt-3 flex flex-col gap-1">
        {rows.map((row) => (
          <div
            key={row.number}
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
              row.state === "next" && "bg-primary-subtle",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-medium transition-colors",
                row.state === "watched" && "bg-muted text-muted-foreground",
                row.state === "next" && "bg-primary text-primary-foreground",
                row.state === "upcoming" && "border border-border text-muted-foreground",
              )}
            >
              {row.state === "watched" ? (
                <Check aria-hidden="true" className="size-3" />
              ) : (
                row.number
              )}
            </span>
            <span
              className={cn(
                "flex-1",
                row.state === "watched" && "text-muted-foreground",
                row.state === "next" && "font-medium text-primary",
                row.state === "upcoming" && "text-muted-foreground",
              )}
            >
              Episode {row.number}
            </span>
            {row.state === "next" ? (
              <button
                type="button"
                onClick={() => setLastWatched(row.number)}
                className="rounded-sm px-2 py-1 text-xs font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Mark watched
              </button>
            ) : null}
          </div>
        ))}
        {caughtUp ? (
          <p className="rounded-md bg-muted px-2.5 py-2 text-sm font-medium text-muted-foreground">
            Caught up
          </p>
        ) : null}
      </div>
    </div>
  );
}
