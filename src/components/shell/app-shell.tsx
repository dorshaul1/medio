import type { ReactNode } from "react";
import { AccountControl } from "@/components/shell/account-control";
import { DesktopNav } from "@/components/shell/desktop-nav";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Wordmark } from "@/components/shell/wordmark";
import { GlobalSearchProvider } from "@/features/search/global-search-provider";
import { GlobalSearchIconTrigger } from "@/features/search/global-search-trigger";
import type { DensityPreferenceValue, MotionPreferenceValue } from "@/server/db/schema/preferences";

type ShellUser = {
  name: string;
  email: string;
};

// Server Component: the shell itself renders no client behavior. Route
// awareness is isolated to DesktopNav/MobileNav; the account control
// (Settings + sign out) is already its own small client leaf.
//
// `data-density`/`data-motion` are set once here, on the one wrapper
// every authenticated page renders inside — see docs/settings.md,
// "Appearance architecture". Product CSS reads these attributes (see
// globals.css) rather than components branching on the preference value
// individually, so density/motion never need threading through props.
export function AppShell({
  children,
  user,
  density,
  motion,
}: {
  children: ReactNode;
  user: ShellUser;
  density: DensityPreferenceValue;
  motion: MotionPreferenceValue;
}) {
  return (
    <GlobalSearchProvider>
      <div className="flex min-h-dvh" data-density={density} data-motion={motion}>
        <DesktopNav user={user} />

        <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
          {/* Mobile has no sidebar to hold secondary controls, so the brand
              mark, Search, and account control get a minimal header strip
              instead. Sticky (not just fixed-at-top-of-page) so it stays
              reachable on long scrolling routes (Library, Diary, Stats)
              without wasting permanent vertical space the way a taller
              always-visible bar would — a solid background (matching
              MobileNav's own bottom bar), not a translucent/blurred one,
              since content should be fully hidden behind it, never showing
              through. */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-1 border-b border-border bg-background px-4 py-3 md:hidden">
            <Wordmark className="shrink-0 text-xl" />
            <div className="flex shrink-0 items-center gap-1">
              <GlobalSearchIconTrigger />
              <AccountControl name={user.name} email={user.email} />
            </div>
          </div>

          <main className="flex-1">{children}</main>
        </div>

        <MobileNav />
      </div>
    </GlobalSearchProvider>
  );
}
