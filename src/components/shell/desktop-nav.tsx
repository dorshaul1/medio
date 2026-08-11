"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountControl } from "@/components/shell/account-control";
import { Wordmark } from "@/components/shell/wordmark";
import { isNavItemActive, primaryNavigation } from "@/config/navigation";
import { GlobalSearchNavTrigger } from "@/features/search/global-search-trigger";
import { cn } from "@/lib/utils";

// The only reason this is a Client Component: it needs the current pathname
// to mark the active destination. Everything else in the shell stays server-rendered.
export function DesktopNav({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border px-4 py-6 md:flex"
    >
      <div className="flex flex-col gap-8">
        <Wordmark className="px-2.5" />
        <GlobalSearchNavTrigger />
        <ul className="flex flex-col gap-1">
          {primaryNavigation.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                {/* A quiet neutral row fill reads as more considered than a
                    thin marker line, and stays well inside "not a
                    saturated background" — the active *icon* alone carries
                    the one restrained clay accent (see CLAUDE.md, "Visual
                    system"); the label itself stays neutral foreground
                    text, never clay. */}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors select-none",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={active ? 2.25 : 1.75}
                    className={cn("size-[1.1rem]", active && "text-primary")}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <AccountControl name={user.name} email={user.email} />
    </nav>
  );
}
