import { ArrowLeftRight, Film, ListVideo, Palette, Tv } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComparisonFact, StatsComparison } from "@/server/stats/types";

// A quiet visual anchor per fact kind — never a color (see CLAUDE.md,
// "No judgment": this app never tells you more/less is good or bad), so
// the only thing an icon adds here is faster scanning across a list of
// otherwise-identical-looking sentences, exactly like `CalendarEventRow`'s
// own kind icons.
const FACT_ICON: Record<ComparisonFact["kind"], LucideIcon> = {
  movies: Film,
  shows: Tv,
  episodes: ListVideo,
  genreShift: Palette,
  movieVsShowShift: ArrowLeftRight,
};

// Compare's own restrained output — a short list of plain-language facts
// (see docs/stats.md, "Comparison"), never a red/green up/down grid and
// never a second copy of the whole page. Each fact is already a complete,
// server-composed sentence (`deriveStatsComparison`, server/stats/
// compare.ts) — this only ever adds a kind icon and a calm list
// treatment, never re-phrases or re-derives anything from it. Renders
// nothing at all when there's nothing meaningfully different to say.
export function StatsComparisonSection({ comparison }: { comparison: StatsComparison }) {
  if (!comparison) return null;

  return (
    <section aria-labelledby="stats-comparison" className="flex flex-col gap-3">
      <h2
        id="stats-comparison"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        Compared to {comparison.previousLabel}
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {comparison.facts.map((fact) => {
          const Icon = FACT_ICON[fact.kind];
          return (
            <li key={fact.kind} className="flex items-center gap-3 px-4 py-3">
              <Icon
                aria-hidden="true"
                strokeWidth={1.75}
                className="size-4 shrink-0 text-muted-foreground"
              />
              <p className="text-sm text-foreground">{fact.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
