import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatStatsRangeParam, type StatsRange } from "@/server/stats/range";

export type StatsTab = "overview" | "taste";

const TABS: { value: StatsTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "taste", label: "Taste" },
];

function tabHref(tab: StatsTab, range: StatsRange, compare: boolean): Route {
  const params = new URLSearchParams({ range: formatStatsRangeParam(range) });
  if (compare) params.set("compare", "1");
  if (tab !== "overview") params.set("tab", tab);
  return `/stats?${params.toString()}` as Route;
}

// Page-level content mode, not a second date-range control — the
// selected range/compare state always carries through unchanged (see
// docs/stats.md, "Information architecture"). Deliberately a plain
// server-rendered link row, not the Radix `Tabs` primitive: switching
// tabs here is a real navigation (a new `?tab=` URL, same convention
// `?range=` already uses), not local client state. Reuses the same
// typography-led, underline-indicated look `components/ui/tabs.tsx`
// establishes rather than inventing a second tab visual language.
export function StatsTabs({
  active,
  range,
  compare,
}: {
  active: StatsTab;
  range: StatsRange;
  compare: boolean;
}) {
  return (
    <nav aria-label="Stats section" className="flex items-center gap-5 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tabHref(tab.value, range, compare)}
          aria-current={tab.value === active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors select-none",
            "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            tab.value === active && "border-primary text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
