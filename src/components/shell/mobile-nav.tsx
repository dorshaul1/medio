"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, primaryNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

// Only the primary destinations live here — this is the mobile equivalent
// of the desktop rail, not a place for secondary controls like the theme
// toggle (that lives in the mobile header strip instead; see AppShell).
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex w-full">
        {primaryNavigation.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] transition-colors select-none",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {/* The active *icon* alone carries the one restrained clay
                    accent, same convention DesktopNav's own row uses — the
                    label stays neutral foreground text, never clay (see
                    CLAUDE.md, "Visual system"). */}
                <Icon
                  aria-hidden="true"
                  strokeWidth={active ? 2.25 : 1.75}
                  className={cn("size-5", active && "text-primary")}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
