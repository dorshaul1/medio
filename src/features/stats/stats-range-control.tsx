"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import type { StatsTab } from "@/features/stats/stats-tabs";
import { cn } from "@/lib/utils";
import {
  formatStatsRangeParam,
  type StatsRange,
  statsRangeSupportsComparison,
} from "@/server/stats/range";

function rangesEqual(a: StatsRange, b: StatsRange): boolean {
  return formatStatsRangeParam(a) === formatStatsRangeParam(b);
}

function rangeHref(range: StatsRange, compare: boolean, tab: StatsTab): Route {
  const params = new URLSearchParams({ range: formatStatsRangeParam(range) });
  if (compare && statsRangeSupportsComparison(range)) params.set("compare", "1");
  if (tab !== "overview") params.set("tab", tab);
  return `/stats?${params.toString()}` as Route;
}

function RangeChip({
  range,
  label,
  active,
  compare,
  tab,
}: {
  range: StatsRange;
  label: string;
  active: boolean;
  compare: boolean;
  tab: StatsTab;
}) {
  return (
    <Link
      href={rangeHref(range, compare, tab)}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-background hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

// Stats' compact date-range control — a small, fixed row of chips, never
// an enterprise date-range picker (see docs/stats.md, "Date ranges").
// Deliberately just three static options, always in this order — no
// year-number chip, no overflow "More" picker. Which one a user lands
// on is a real Settings preference (`statsDefaultRange` — Settings →
// Defaults → "Default Stats range"), defaulting to "All time" —
// `parseStatsRangeParam`'s own fallback resolves the same preference via
// `resolveDefaultStatsRange`, so this control and the page's default
// never disagree. A specific past year remains reachable by URL
// (`?range=2025`) for anyone who wants it, just not promoted here.
// Compare is a single toggle, hidden entirely for "All time" (there's no
// meaningful previous all-time period — see
// `statsRangeSupportsComparison`).
export function StatsRangeControl({
  activeRange,
  compare,
  tab,
}: {
  activeRange: StatsRange;
  compare: boolean;
  // Which tab is currently active — carried through every chip's own
  // href so switching range never silently drops back to Overview while
  // on Taste (a real bug this fixes: range and tab are two independent
  // pieces of URL state, see docs/stats.md, and every control that
  // writes one must preserve the other).
  tab: StatsTab;
}) {
  const router = useRouter();
  const now = new Date();

  const chips: { range: StatsRange; label: string }[] = [
    { range: { kind: "all" }, label: "All time" },
    { range: { kind: "year", year: now.getUTCFullYear() }, label: "This year" },
    {
      range: { kind: "month", year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 },
      label: "This month",
    },
  ];

  function toggleCompare(checked: boolean) {
    router.push(rangeHref(activeRange, checked, tab));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav aria-label="Date range" className="flex items-center gap-1 rounded-md bg-muted p-1">
        {chips.map((chip) => (
          <RangeChip
            key={formatStatsRangeParam(chip.range)}
            range={chip.range}
            label={chip.label}
            active={rangesEqual(chip.range, activeRange)}
            compare={compare}
            tab={tab}
          />
        ))}
      </nav>

      {statsRangeSupportsComparison(activeRange) ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={compare}
            onCheckedChange={toggleCompare}
            aria-labelledby="stats-compare-toggle-label"
          />
          <span id="stats-compare-toggle-label">Compare to previous period</span>
        </div>
      ) : null}
    </div>
  );
}
