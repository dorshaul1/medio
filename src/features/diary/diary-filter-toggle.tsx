import type { Route } from "next";
import { LinkTabs } from "@/components/ui/link-tabs";
import { formatMonthParam } from "@/lib/month";
import type { DiaryFilter, DiaryPeriod } from "@/server/diary/types";

// "TV" (not "Episodes") for episode viewing events — the same
// product-facing vocabulary this application already uses elsewhere
// (Discover's Movies/Shows mode, Library's media-type filter) — see
// docs/diary.md, "Filtering".
const OPTIONS: readonly { value: DiaryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movies", label: "Movies" },
  { value: "tv", label: "TV" },
];

export function DiaryFilterToggle({
  active,
  sort,
  period,
}: {
  active: DiaryFilter;
  sort: string | undefined;
  // Carried through so switching the type filter never silently jumps
  // away from whatever month the user is currently looking at (see
  // docs/diary.md, "Month-scoped querying").
  period: DiaryPeriod;
}) {
  return (
    <LinkTabs
      ariaLabel="History type"
      active={active}
      items={OPTIONS.map((option) => {
        const params = new URLSearchParams({ month: formatMonthParam(period) });
        if (option.value !== "all") params.set("type", option.value);
        if (sort) params.set("sort", sort);
        const href = `/library/diary?${params.toString()}` as Route;
        return { value: option.value, label: option.label, href };
      })}
    />
  );
}
