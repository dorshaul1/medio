import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/server/media/types";

// Plain navigation, not a client-side panel switch — same pattern as
// Discover's MediaTypeToggle. Preserves the other active filters
// (state/sort) when switching type, dropping only `count` (a fresh type
// filter starts back at the first page).
const OPTIONS: readonly { value: MediaType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "show", label: "Shows" },
];

export function LibraryTypeToggle({
  active,
  state,
  sort,
}: {
  active: MediaType | "all";
  state: string | undefined;
  sort: string | undefined;
}) {
  return (
    <nav aria-label="Media type" className="flex items-center gap-5 border-b border-border">
      {OPTIONS.map((option) => {
        const isActive = option.value === active;
        const params = new URLSearchParams();
        if (option.value !== "all") params.set("type", option.value);
        // A state filter meaningful for the previous type may not apply
        // to the new one — drop it rather than carry over a filter that
        // would now silently return nothing.
        if (state && option.value !== "all") params.set("state", state);
        if (sort) params.set("sort", sort);
        const query = params.toString();
        const href = (query ? `/library?${query}` : "/library") as Route;

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
