"use client";

import { ChevronDown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  formatStatsRangeParam,
  type StatsRange,
  statsRangeSupportsComparison,
} from "@/server/stats/range";

function rangesEqual(a: StatsRange, b: StatsRange): boolean {
  return formatStatsRangeParam(a) === formatStatsRangeParam(b);
}

function rangeHref(range: StatsRange, compare: boolean): Route {
  const params = new URLSearchParams({ range: formatStatsRangeParam(range) });
  if (compare && statsRangeSupportsComparison(range)) params.set("compare", "1");
  return `/stats?${params.toString()}` as Route;
}

function RangeChip({
  range,
  label,
  active,
  compare,
}: {
  range: StatsRange;
  label: string;
  active: boolean;
  compare: boolean;
}) {
  return (
    <Link
      href={rangeHref(range, compare)}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

// Stats 2.0's compact date-range control — a row of chips, never an
// enterprise date-range picker (see docs/stats.md, "Date ranges"). "All
// time" first, then the current year (when it has real history), "Last
// 12 months", "This month", and — only once there's more than one active
// year — a small "More" popover listing the rest. Compare is a single
// toggle, hidden entirely for "All time" (there's no meaningful previous
// all-time period — see `statsRangeSupportsComparison`).
export function StatsRangeControl({
  activeRange,
  activeYears,
  compare,
  now,
}: {
  activeRange: StatsRange;
  activeYears: readonly number[];
  compare: boolean;
  now: Date;
}) {
  const router = useRouter();
  const [morePickerOpen, setMorePickerOpen] = useState(false);

  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const primaryYear = activeYears.includes(currentYear) ? currentYear : activeYears[0];
  const overflowYears = activeYears.filter((year) => year !== primaryYear);

  const chips: { range: StatsRange; label: string }[] = [
    { range: { kind: "all" }, label: "All time" },
    ...(primaryYear !== undefined
      ? [{ range: { kind: "year" as const, year: primaryYear }, label: String(primaryYear) }]
      : []),
    { range: { kind: "last12months" }, label: "Last 12 months" },
    { range: { kind: "month", year: currentYear, month: currentMonth }, label: "This month" },
  ];

  function toggleCompare(checked: boolean) {
    router.push(rangeHref(activeRange, checked));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label="Date range" className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <RangeChip
            key={formatStatsRangeParam(chip.range)}
            range={chip.range}
            label={chip.label}
            active={rangesEqual(chip.range, activeRange)}
            compare={compare}
          />
        ))}

        {overflowYears.length > 0 ? (
          <Popover open={morePickerOpen} onOpenChange={setMorePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 rounded-full px-3 text-sm">
                More
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40">
              <ul className="flex flex-col gap-0.5">
                {overflowYears.map((year) => (
                  <li key={year}>
                    <Link
                      href={rangeHref({ kind: "year", year }, compare)}
                      onClick={() => setMorePickerOpen(false)}
                      aria-current={
                        activeRange.kind === "year" && activeRange.year === year
                          ? "true"
                          : undefined
                      }
                      className={cn(
                        "block rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                        activeRange.kind === "year" && activeRange.year === year
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {year}
                    </Link>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        ) : null}
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
