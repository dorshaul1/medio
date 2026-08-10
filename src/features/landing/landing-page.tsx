import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroIllustration } from "@/features/landing/illustrations/hero-illustration";
import { HistoryIllustration } from "@/features/landing/illustrations/history-illustration";
import { LibraryIllustration } from "@/features/landing/illustrations/library-illustration";
import { PickForMeIllustration } from "@/features/landing/illustrations/pick-for-me-illustration";
import { TrackingIllustration } from "@/features/landing/illustrations/tracking-illustration";
import { WhatsNextIllustration } from "@/features/landing/illustrations/whats-next-illustration";
import { LandingFooter } from "@/features/landing/landing-footer";
import { PublicNav } from "@/features/landing/public-nav";

// MEDIO's public front door — see docs/authentication.md, "`/` behavior
// by auth state": rendered only for a logged-out visitor (app/page.tsx
// branches before this ever mounts). Six deliberately unequal moments,
// not a uniform feature grid (see CLAUDE.md, "Landing") — Tracking and
// Pick for Me carry the most visual weight (MEDIO's foundation and its
// flagship differentiator); "What's next" is a deliberately smaller,
// quieter supporting beat. Two small illustrations
// (TrackingIllustration, LibraryIllustration, PickForMeIllustration) are
// genuinely interactive demo state — the rest are static — but the page
// reads and works completely without touching anything.
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pt-10 pb-24 sm:px-10 lg:flex-row lg:items-center lg:gap-20 lg:pt-20 lg:pb-32">
          <div className="flex max-w-xl flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <h1 className="text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Everything you watch.
              <br />
              Never lose your place.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground text-balance">
              MEDIO keeps your movies, shows, and episodes in one personal place — and remembers
              exactly where you stopped.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Button asChild size="lg">
                <Link href="/sign-up">Get started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-in">Log in</Link>
              </Button>
            </div>
          </div>

          <div className="w-full max-w-sm lg:flex-1">
            <HeroIllustration />
          </div>
        </section>

        {/* Tracking — a full-bleed immersive moment, MEDIO's foundation. */}
        <section className="bg-surface-subtle px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row lg:gap-20">
            <div className="flex max-w-md flex-col gap-4 text-center lg:flex-1 lg:text-left">
              <p className="text-xs font-medium tracking-wide text-primary uppercase">Tracking</p>
              <h2 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
                Never lose your place
              </h2>
              <p className="text-muted-foreground text-balance">
                MEDIO remembers exactly which episode comes next — not just that you watched some of
                a show. Try it below.
              </p>
            </div>
            <div className="flex justify-center lg:flex-1 lg:justify-end">
              <TrackingIllustration />
            </div>
          </div>
        </section>

        {/* Library — asymmetric, offset from the standard 50/50 rhythm. */}
        <section className="px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row-reverse lg:items-center lg:gap-24">
            <div className="flex max-w-sm flex-col gap-4 text-center lg:flex-1 lg:text-left">
              <p className="text-xs font-medium tracking-wide text-primary uppercase">Library</p>
              <h2 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
                A library that actually helps
              </h2>
              <p className="text-muted-foreground text-balance">
                Keep what you&rsquo;re curious about separate from what you actually plan to watch.
                MEDIO understands the difference.
              </p>
            </div>
            <div className="flex justify-center lg:w-[28rem] lg:justify-start">
              <LibraryIllustration />
            </div>
          </div>
        </section>

        {/* Pick for Me — the flagship moment, breaking out to full width. */}
        <section className="border-y border-border bg-surface-subtle px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">Pick for me</p>
            <h2 className="max-w-2xl text-4xl font-medium tracking-tight text-balance sm:text-5xl">
              Stop wondering what to watch
            </h2>
            <p className="max-w-lg text-muted-foreground text-balance">
              Instead of another endless recommendation feed, MEDIO gives you one strong choice —
              based on what you&rsquo;re already watching, what you&rsquo;ve saved, and how much
              time you have.
            </p>
            <div className="mt-4 w-full max-w-md">
              <PickForMeIllustration />
            </div>
          </div>
        </section>

        {/* What's next — a deliberately smaller, quieter supporting beat. */}
        <section className="px-6 py-16 sm:px-10 sm:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 sm:flex-row sm:gap-16">
            <div className="max-w-xs text-center sm:flex-1 sm:text-left">
              <h2 className="text-2xl font-medium tracking-tight text-balance">
                Always know what&rsquo;s next
              </h2>
              <p className="mt-2 text-sm text-muted-foreground text-balance">
                Continuations and releases you actually care about — never a feed to scroll through.
              </p>
            </div>
            <div className="flex justify-center sm:flex-1 sm:justify-end">
              <WhatsNextIllustration />
            </div>
          </div>
        </section>

        {/* History — the more you watch, the more MEDIO becomes yours. */}
        <section className="bg-surface-subtle px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row lg:gap-20">
            <div className="flex max-w-md flex-col gap-4 text-center lg:flex-1 lg:text-left">
              <p className="text-xs font-medium tracking-wide text-primary uppercase">
                Your history
              </p>
              <h2 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
                It becomes more yours the more you watch
              </h2>
              <p className="text-muted-foreground text-balance">
                Every watch adds to a personal record — a diary of what you saw, and a clearer sense
                of what you actually enjoy.
              </p>
            </div>
            <div className="flex justify-center lg:flex-1 lg:justify-end">
              <HistoryIllustration />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-24 text-center sm:px-10 sm:py-32">
          <h2 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Your next watch starts here.
          </h2>
          <Button asChild size="lg">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
