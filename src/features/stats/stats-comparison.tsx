import type { StatsComparison } from "@/server/stats/types";

// Compare's own restrained output — a short list of plain-language facts
// (see docs/stats.md, "Comparison"), never a red/green up/down grid and
// never a second copy of the whole page. Renders nothing at all when
// there's nothing meaningfully different to say — see
// `deriveStatsComparison` (server/stats/compare.ts).
export function StatsComparisonSection({ comparison }: { comparison: StatsComparison }) {
  if (!comparison) return null;

  return (
    <section
      aria-labelledby="stats-comparison"
      className="flex flex-col gap-2 border-l-2 border-border pl-4"
    >
      <h2 id="stats-comparison" className="text-sm font-medium text-muted-foreground">
        Compared to {comparison.previousLabel}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {comparison.facts.map((fact) => (
          <li key={fact.kind} className="text-sm text-foreground">
            {fact.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
