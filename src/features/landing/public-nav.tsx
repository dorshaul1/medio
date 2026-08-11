import Link from "next/link";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { LandingThemeToggle } from "@/features/landing/landing-theme-toggle";

// The entire public navigation surface — see CLAUDE.md, "Public
// Information Architecture". Deliberately not the authenticated side
// rail/bottom bar: a logged-out visitor has no product state to
// navigate, only a brand mark and the two ways into the product. Stays
// a Server Component; the one interactive piece (theme) is its own
// small client leaf. Sticky with a quiet translucent backdrop (not a
// scroll-triggered blur — a fixed, always-on treatment needs no client
// JS at all) so Get started stays reachable on a longer page without
// ever reading as a heavy glassmorphism bar.
export function PublicNav() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/60 bg-background/85 px-6 py-5 backdrop-blur-sm sm:px-10">
      <Link href="/" aria-label="MEDIO home">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-1 sm:gap-2">
        <LandingThemeToggle />
        <Button asChild variant="ghost">
          <Link href="/sign-in">Log in</Link>
        </Button>
        <Button asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
      </div>
    </header>
  );
}
