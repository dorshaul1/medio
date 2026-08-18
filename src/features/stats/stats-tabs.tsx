import type { Route } from "next";
import { LinkTabs } from "@/components/ui/link-tabs";
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
// docs/stats.md, "Information architecture").
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
    <LinkTabs
      ariaLabel="Stats section"
      active={active}
      items={TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        href: tabHref(tab.value, range, compare),
      }))}
    />
  );
}
