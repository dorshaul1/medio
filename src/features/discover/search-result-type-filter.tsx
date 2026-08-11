import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  type SearchResultTypeFilter as ResultTypeFilterValue,
  SEARCH_RESULT_TYPES,
} from "@/server/search/constants";

const LABEL: Record<ResultTypeFilterValue, string> = {
  all: "All",
  movies: "Movies",
  shows: "Shows",
  people: "People",
};

// An optional narrowing filter on an already-coherent unified ranking —
// "All" is always the default (see docs/search.md, "Unified
// search ranking"); this is never the initial architecture. Deliberately
// small, plain text links (not a bordered tab strip/segmented control
// competing visually with the results themselves) — the product spec's
// own "keep it extremely compact... the user should rarely need it".
export function SearchResultTypeFilter({
  query,
  active,
}: {
  query: string;
  active: ResultTypeFilterValue;
}) {
  return (
    <nav aria-label="Filter results by type" className="flex items-center gap-4 text-sm">
      {SEARCH_RESULT_TYPES.map((type) => {
        const isActive = type === active;
        const params = new URLSearchParams({ q: query });
        if (type !== "all") params.set("resultType", type);
        const href = `/discover?${params.toString()}` as Route;

        return (
          <Link
            key={type}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LABEL[type]}
          </Link>
        );
      })}
    </nav>
  );
}
