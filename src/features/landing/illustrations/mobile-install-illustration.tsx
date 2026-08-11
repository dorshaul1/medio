import { Clapperboard, Compass, Home, Library, Tv } from "lucide-react";
import { MedioMark } from "@/components/medio-mark";
import { Wordmark } from "@/components/shell/wordmark";
import { DEMO_MOVIE_WATCHLIST, DEMO_SHOW_WATCHING } from "@/features/landing/demo-content";
import { DemoPoster } from "@/features/landing/demo-poster";

// "MEDIO, one tap away" — a minimal, abstract Home Screen moment, never
// a realistic phone-bezel mockup (no notch, no side buttons, no 3D tilt
// — see docs/pwa.md, "Landing illustration"). The device is a plain
// rounded-square frame; inside it is a genuinely miniature version of
// MEDIO's own mobile shell (sticky header + two content tiles + bottom
// nav, using the same `DemoPoster` primitive every other Landing
// illustration already uses), so a visitor recognizes it as *this*
// product, not a generic app screenshot. The real app-icon mark
// (`MedioMark` — the same component the actual `/icon`/`/apple-icon`
// routes render) sits over the corner, "landing" onto the Home Screen.
export function MobileInstallIllustration() {
  return (
    <div className="relative w-full max-w-[13rem]">
      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <Wordmark className="text-base" />
          <Compass
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-3.5 text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 p-3">
          <DemoPoster tone="lavender" icon={Tv} size="md" />
          <DemoPoster tone="peach" icon={Clapperboard} size="md" />
        </div>
        <p className="px-3 pb-1 text-[0.6rem] text-muted-foreground">
          {DEMO_SHOW_WATCHING.title} · {DEMO_MOVIE_WATCHLIST.title}
        </p>
        <div className="mt-1 flex items-center justify-around border-t border-border py-2.5">
          <Home aria-hidden="true" strokeWidth={2} className="size-4 text-primary" />
          <Compass
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-4 text-muted-foreground/60"
          />
          <Library
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-4 text-muted-foreground/60"
          />
        </div>
      </div>

      <div className="absolute -top-3.5 -right-3.5 drop-shadow-sm">
        <MedioMark size={52} />
      </div>
    </div>
  );
}
