"use client";

import { Bookmark, Clapperboard, ListVideo, Tv } from "lucide-react";
import { useState } from "react";
import { DEMO_MOVIE_BACKLOG } from "@/features/landing/demo-content";
import { DemoPoster } from "@/features/landing/demo-poster";
import { cn } from "@/lib/utils";

const STATES = [
  { key: "watchlist", label: "Watchlist", meaning: "Interested", icon: Bookmark },
  { key: "backlog", label: "Backlog", meaning: "Actually plan to watch", icon: ListVideo },
  { key: "watching", label: "Watching", meaning: "Active right now", icon: Tv },
] as const;

// "MEDIO understands intention" — demonstrated with one real state
// transition rather than three static rows (see CLAUDE.md, "Landing").
// Never a Kanban board: one title, one control, moving through the same
// three real MEDIO states in order.
export function LibraryIllustration() {
  const [stateIndex, setStateIndex] = useState(0);
  const current = STATES[stateIndex];
  if (!current) return null;

  return (
    <div className="w-full max-w-xs rounded-lg border border-border bg-surface p-4 shadow-sm sm:max-w-sm">
      <div className="flex items-center gap-3">
        <DemoPoster tone="peach" icon={Clapperboard} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{DEMO_MOVIE_BACKLOG.title}</p>
          <p className="text-sm text-muted-foreground">{current.meaning}</p>
        </div>
      </div>

      <fieldset className="mt-4 flex gap-1.5 border-none p-0">
        <legend className="sr-only">Move Paper Moons to a different state</legend>
        {STATES.map((state, index) => (
          <button
            key={state.key}
            type="button"
            aria-pressed={index === stateIndex}
            onClick={() => setStateIndex(index)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
              index === stateIndex
                ? "border-primary-border bg-primary-subtle text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <state.icon aria-hidden="true" className="size-3.5" />
            {state.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
