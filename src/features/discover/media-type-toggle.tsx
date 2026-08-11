import Link from "next/link";
import type { DiscoverMediaType } from "@/features/discover/discover-params";
import { cn } from "@/lib/utils";

// Plain navigation (two real URLs, real content difference), not a
// client-side panel switch — so this is real <Link>s with aria-current,
// the same pattern DesktopNav/MobileNav already use for "this is where
// you are", not an ARIA tablist (which implies a same-page tabpanel this
// isn't). No "use client": navigation doesn't need it.
const OPTIONS: readonly {
  value: DiscoverMediaType;
  label: string;
  href: "/discover" | "/discover?type=shows";
}[] = [
  { value: "movies", label: "Movies", href: "/discover" },
  { value: "shows", label: "Shows", href: "/discover?type=shows" },
];

export function MediaTypeToggle({ active }: { active: DiscoverMediaType }) {
  return (
    <nav aria-label="Media type" className="flex items-center gap-5 border-b border-border">
      {OPTIONS.map((option) => {
        const isActive = option.value === active;
        return (
          <Link
            key={option.value}
            href={option.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors select-none",
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
