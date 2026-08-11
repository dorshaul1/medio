"use client";

import { Clapperboard, Sparkles, Tv } from "lucide-react";
import { useState } from "react";
import { DemoArtwork } from "@/features/landing/demo-artwork";
import { DemoPoster } from "@/features/landing/demo-poster";
import { cn } from "@/lib/utils";

type ContextKey = "quick" | "movie" | "anything";

const CONTEXTS: readonly { key: ContextKey; label: string }[] = [
  { key: "quick", label: "Quick" },
  { key: "movie", label: "Movie night" },
  { key: "anything", label: "Anything" },
];

// A precomputed demo pick per context — never derived by any real
// scoring, purely illustrative (see CLAUDE.md, "Pick for Me" — no fake
// scores, no AI framing). Switching context swaps the Best Pick, the one
// interaction on the page that most directly demonstrates MEDIO's
// decision philosophy: a real answer changes with real constraints.
const BEST_PICK: Record<
  ContextKey,
  { tone: "sage" | "blue" | "peach"; icon: typeof Tv; title: string; reason: string }
> = {
  quick: {
    tone: "sage",
    icon: Tv,
    title: "Nightfall County",
    reason: "You're one episode from finishing it.",
  },
  movie: {
    tone: "blue",
    icon: Clapperboard,
    title: "The Quiet Hour",
    reason: "A two-hour movie that fits tonight.",
  },
  anything: {
    tone: "peach",
    icon: Tv,
    title: "The Long Season",
    reason: "Picks up exactly where you left off.",
  },
};

const ALTERNATIVES = [
  { tone: "peach" as const, icon: Clapperboard, title: "Paper Moons", note: "From your Backlog" },
  { tone: "lavender" as const, icon: Clapperboard, title: "Low Tide", note: "Shorter option" },
];

// MEDIO's flagship decision moment — the page's most deliberately
// interactive illustration (see CLAUDE.md, "Landing"). One dominant Best
// Pick, two genuinely smaller alternatives — never a recommendation
// carousel, never equal-weight cards.
export function PickForMeIllustration() {
  const [context, setContext] = useState<ContextKey>("quick");
  const pick = BEST_PICK[context];

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">What should I watch?</p>
        <fieldset className="flex gap-1 rounded-full border border-border p-0.5">
          <legend className="sr-only">Time available</legend>
          {CONTEXTS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={context === option.key}
              onClick={() => setContext(option.key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
                context === option.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      </div>

      <DemoArtwork tone={pick.tone} icon={pick.icon} className="mt-4 aspect-[16/7] w-full">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/85 uppercase">
            <Sparkles aria-hidden="true" className="size-3" /> Best pick
          </p>
          <p className="font-medium text-white">{pick.title}</p>
          <p className="text-sm text-white/85">{pick.reason}</p>
        </div>
      </DemoArtwork>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {ALTERNATIVES.map((alt) => (
          <div
            key={alt.title}
            className="flex items-center gap-2 rounded-md border border-border p-2"
          >
            <DemoPoster tone={alt.tone} icon={alt.icon} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{alt.title}</p>
              <p className="text-[0.6875rem] text-muted-foreground">{alt.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
