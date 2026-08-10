import type { Route } from "next";
import Link from "next/link";
import { personHref } from "@/features/media/person-route";
import { cn } from "@/lib/utils";
import type { CreditRole } from "@/server/people/types";

const LABELS: Record<CreditRole, string> = {
  directing: "Directing",
  writing: "Writing",
  producing: "Producing",
  acting: "Acting",
};

// Plain navigation via real links (`?credit=`), not a client-side panel
// switch — same pattern as LibraryTypeToggle/MediaTypeToggle, and keeps
// the filter URL-addressable (see docs/media-provider.md, "URL state").
// Only rendered by the caller when there's more than one section — a
// single-profession career (most actors have no Directing/Writing/
// Producing credits at all) gets no filter chrome.
export function PersonFilmographyFilter({
  personId,
  roles,
  active,
}: {
  personId: number;
  roles: readonly CreditRole[];
  active: CreditRole | "all";
}) {
  const options: readonly (CreditRole | "all")[] = ["all", ...roles];

  return (
    <nav aria-label="Filmography filter" className="flex items-center gap-5 border-b border-border">
      {options.map((option) => {
        const isActive = option === active;
        const href = (
          option === "all" ? personHref(personId) : `${personHref(personId)}?credit=${option}`
        ) as Route;

        return (
          <Link
            key={option}
            href={href}
            // This changes only `?credit=` on the same page — Next's
            // default navigation scroll-to-top makes sense for a real
            // page change, not for staying on Filmography and swapping
            // which section is visible.
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors",
              "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "border-primary text-foreground",
            )}
          >
            {option === "all" ? "All" : LABELS[option]}
          </Link>
        );
      })}
    </nav>
  );
}
