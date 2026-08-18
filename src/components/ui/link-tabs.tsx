import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type LinkTabItem = {
  value: string;
  label: string;
  href: Route;
};

// The same typography-led underline language `Tabs` establishes, for the
// far more common case in this app: switching "tabs" is a real navigation
// (a new URL — `?tab=`, `?type=`, `?view=`, ...), not a same-page panel
// swap. `Tabs` (Radix, client state) stays for genuine same-page panel
// switching; nothing in the product currently needs that, which is why
// every real tab-like control (Stats Overview/Taste, Discover Movies/
// Shows, Library media type, Diary type, Calendar view, Filmography role)
// uses this instead — see docs/design-system.md, "LinkTabs".
export function LinkTabs({
  items,
  active,
  ariaLabel,
  scroll,
}: {
  items: readonly LinkTabItem[];
  active: string;
  ariaLabel: string;
  // Next's default (`true`, scroll-to-top-on-navigate) is right for a
  // real page change; pass `false` for a filter that changes a query
  // param but keeps the user looking at the same content.
  scroll?: boolean;
}) {
  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-5 border-b border-border">
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <Link
            key={item.value}
            href={item.href}
            {...(scroll === undefined ? {} : { scroll })}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors select-none",
              "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "border-primary text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
