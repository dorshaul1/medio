import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DiaryFilter } from "@/server/diary/types";

// "TV" (not "Episodes") for episode viewing events — the same
// product-facing vocabulary this application already uses elsewhere
// (Discover's Movies/Shows mode, Library's media-type filter) — see
// docs/diary.md, "Filtering". Same plain-navigation underline pattern as
// `LibraryTypeToggle`, not a client-side panel switch.
const OPTIONS: readonly { value: DiaryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movies", label: "Movies" },
  { value: "tv", label: "TV" },
];

export function DiaryFilterToggle({
  active,
  sort,
}: {
  active: DiaryFilter;
  sort: string | undefined;
}) {
  return (
    <nav aria-label="History type" className="flex items-center gap-5 border-b border-border">
      {OPTIONS.map((option) => {
        const isActive = option.value === active;
        const params = new URLSearchParams();
        if (option.value !== "all") params.set("type", option.value);
        if (sort) params.set("sort", sort);
        const query = params.toString();
        const href = (query ? `/library/diary?${query}` : "/library/diary") as Route;

        return (
          <Link
            key={option.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors",
              "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "border-primary text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
