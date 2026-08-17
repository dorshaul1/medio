"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconButton } from "@/components/ui/icon-button";
import { clearRecentSearches } from "@/features/search/recent-searches";
import { authClient } from "@/lib/auth-client";

// The smallest useful identity treatment: name/email (truncated, no
// avatar — Better Auth's `image` is normally absent for email/password
// accounts, and a generated placeholder avatar would look accidental, not
// designed) plus the two controls that belong in this secondary area.
// Settings lives here (desktop: bottom of the side rail; mobile: the
// header strip) rather than as a sixth/fifth primary nav destination —
// see docs/settings.md. Theme moved into Settings itself (a visual
// picker with real previews, not a quick cycle-through icon), so the
// standalone `ThemeToggle` that used to live here was removed as dead
// UI rather than kept as a duplicate control.
export function AccountControl({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();

  function handleSignOut() {
    // `fetchOptions.onSuccess` (Better Auth's own documented pattern) —
    // deliberately not a bare `.then()`, which would silently leave the
    // button appearing to do nothing if the request ever failed. Logout
    // always returns to the public Landing page, never back to Sign In —
    // see docs/authentication.md, "Logout destination".
    //
    // A hard navigation (`window.location.href`), not `router.push` +
    // `router.refresh()`: when the signed-in visitor is already on `/`
    // (Home) — the single most common place to click Sign out from —
    // `router.push("/")` targets the exact URL already loaded, so
    // Next.js's client router can no-op the navigation and leave the
    // stale authenticated shell on screen even though the session was
    // genuinely cleared server-side. A full reload has no such edge
    // case: every bit of client state is wiped and `/` is re-requested
    // from the server fresh, which is also thematically right for a
    // "leave the application" transition (see CLAUDE.md, "Authentication").
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Recent Search terms are the one piece of personal state this
          // app keeps in `localStorage` rather than the database (see
          // features/search/recent-searches.ts) — everything else
          // personalized is server-derived per request and is wiped by
          // the hard navigation below, but this key would otherwise
          // survive it and leak into a different account signing in on
          // the same device/browser (see CLAUDE.md, "Logout/account
          // switching must invalidate private client state").
          clearRecentSearches();
          window.location.href = "/";
        },
      },
    });
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs text-muted-foreground" title={email}>
        {name || email}
      </span>
      <div className="flex shrink-0 items-center">
        <IconButton
          asChild
          aria-label="Settings"
          variant="ghost"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
        >
          <Link href="/settings">
            <Settings />
          </Link>
        </IconButton>
        <IconButton aria-label="Sign out" variant="ghost" onClick={handleSignOut}>
          <LogOut />
        </IconButton>
      </div>
    </div>
  );
}
