"use client";

import { Button } from "@/components/ui/button";
import { clearRecentSearches } from "@/features/search/recent-searches";
import { authClient } from "@/lib/auth-client";

// The canonical Logout action — lives in Account now, not in the app
// shell (see docs/settings.md, "Account"). A plain secondary button, not
// destructive-styled: signing out isn't a destructive action.
//
// `fetchOptions.onSuccess` (Better Auth's own documented pattern) —
// deliberately not a bare `.then()`, which would silently leave the
// button appearing to do nothing if the request ever failed. Logout
// always returns to the public Landing page, never back to Sign In — see
// docs/authentication.md, "Logout destination".
//
// A hard navigation (`window.location.href`), not `router.push` +
// `router.refresh()`: if the signed-in visitor got here having been on
// `/` moments before, `router.push("/")` would target the exact URL
// already loaded and Next.js's client router could no-op the navigation,
// leaving the stale authenticated shell on screen even though the
// session was genuinely cleared server-side. A full reload has no such
// edge case: every bit of client state is wiped and `/` is re-requested
// from the server fresh — also thematically right for a "leave the
// application" transition.
export function LogoutControl() {
  function handleSignOut() {
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
    <Button variant="secondary" onClick={handleSignOut}>
      Log out
    </Button>
  );
}
