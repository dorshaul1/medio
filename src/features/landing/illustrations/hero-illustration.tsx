import { Sparkles } from "lucide-react";
import { DEMO_SHOW_CURRENT } from "@/features/landing/demo-content";

// One evolving visual story, not three scattered cards (see CLAUDE.md,
// "Landing" and docs/architecture.md if this pattern is ever reused
// elsewhere): a single tall artwork panel — scrimmed and white-texted
// exactly like the real product's own `UpNextCard`, the most authentic
// visual language MEDIO already has — carries the episode-progress
// story, with "what's next" and "Pick for Me" tucked into it as
// overlapping badges rather than independent floating boxes.
//
// Bespoke to this one panel rather than built on the shared
// `DemoArtwork` shell every other illustration uses — the Hero is the
// very first thing a visitor sees, so it earns its own, richer
// treatment (see CLAUDE.md, "Section visual weight is deliberately
// unequal ... layout varies intentionally per section"). Its color comes
// from several overlapping soft, blurred pastel fields rather than one
// flat two-stop gradient — closer to how a real backdrop photo actually
// reads (uneven, layered light) than a single flat wash, and, critically,
// still has real presence once composited in dark mode: a flat gradient
// faded toward `surface-subtle` all but disappears against MEDIO's
// near-black canvas, so each field here stays close to fully opaque and
// lets blur alone soften its edges, rather than relying on transparency
// for softness. Still entirely plain HTML/CSS (no real provider artwork,
// no fabricated screenshot) — an abstract stand-in for artwork, same
// rule every Landing illustration follows.
export function HeroIllustration() {
  const { title, season, lastWatchedEpisode, nextEpisode, seasonEpisodeCount } = DEMO_SHOW_CURRENT;
  const progress = lastWatchedEpisode / seasonEpisodeCount;

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-xs sm:max-w-sm lg:mx-0">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border bg-surface-subtle">
        <div className="absolute -top-[15%] -right-[20%] size-[70%] rounded-full bg-pastel-blue blur-3xl" />
        <div className="absolute top-[20%] -left-[25%] size-[75%] rounded-full bg-pastel-peach/90 blur-3xl" />
        <div className="absolute -bottom-[20%] left-[10%] size-[65%] rounded-full bg-pastel-lavender/80 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/15 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
          <p className="text-lg font-medium text-white">{title}</p>
          <p className="text-sm text-white/80">
            Season {season} · Episode {lastWatchedEpisode} watched
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>

      {/* "Up next" — a badge tucked onto the artwork's own corner, not a
          separate card. */}
      <div className="absolute top-4 -right-3 rounded-lg border border-border bg-surface px-3 py-2 sm:-right-6">
        <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          Up next
        </p>
        <p className="text-sm font-medium text-primary">
          S{season} E{nextEpisode}
        </p>
      </div>

      {/* Pick for Me — tucked under the artwork's bottom edge, continuing
          the same story downward rather than sitting apart from it. */}
      <div className="absolute -bottom-5 left-6 flex items-center gap-1.5 rounded-full border border-primary-border bg-primary-subtle px-3 py-1.5 sm:left-10">
        <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
        <p className="text-xs font-medium text-primary">Tonight&rsquo;s pick, ready</p>
      </div>
    </div>
  );
}
