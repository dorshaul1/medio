import Image from "next/image";
import type { ReactNode } from "react";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/server/media/types";

// The shared visual shell for Movie Details and Show Details: backdrop
// bleed (flush to the top of the content area, faded into the page
// background at the bottom), the poster, and the overlap positioning
// between them. Each caller supplies its own identity/metadata column as
// `children` — title, tagline, metadata line, credits, trailer button —
// since a movie's and a show's information hierarchy genuinely differ
// (see docs/architecture.md). Not a "MediaDetailsPage" universal
// abstraction: only the artwork shell is shared, never the content
// structure. No back button here — primary navigation (the sidebar/
// bottom nav) is how these pages are left; a genre's "View all" page is
// the one place a real browser-history back still applies (see
// `components/shell/back-button.tsx`).
export function MediaDetailHero({
  backdrop,
  poster,
  mediaType,
  children,
}: {
  backdrop: string | null;
  poster: string | null;
  mediaType: MediaType;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      {backdrop ? (
        // -mt-8/lg:-mt-10 cancels PageContainer's own top padding (see
        // its py-8/lg:py-10) so the backdrop bleeds flush to the top of
        // the content area instead of floating below a band of empty
        // space — the same reasoning as the -mx-* bleed to its left/right
        // edges, just for the top edge too.
        <div className="relative -mx-5 -mt-8 h-[46vw] max-h-[420px] min-h-[200px] sm:-mx-8 lg:-mx-10 lg:-mt-10">
          <Image src={backdrop} alt="" fill priority sizes="100vw" className="object-cover" />
          {/* Fades the backdrop into the page background at the bottom
              rather than ending in a hard edge — the poster/metadata
              block below reads as sitting on the page, not on a separate
              image panel. (The title row now always paints above this —
              see the z-10 below — so this is purely a visual fade, not
              something the title's own legibility depends on.) */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent" />
        </div>
      ) : null}

      <div
        className={cn(
          // relative z-10: without an explicit stacking order, the
          // backdrop above (position: relative, for its own Image fill)
          // paints *above* this row's default static position regardless
          // of DOM order — a real CSS stacking rule, not a z-index fight
          // either box was consciously trying to win. That let the
          // backdrop image visibly paint over the top of the title
          // wherever the negative-margin overlap below reached it —
          // confirmed via a real rendered screenshot, not just source
          // inspection. This establishes this row as the one that wins.
          "relative z-10 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6",
          // The overlap trick only applies once there's room for it —
          // stacked and non-overlapping on mobile, overlapping the
          // backdrop's fade on sm+.
          backdrop ? "mt-5 sm:-mt-20" : "mt-1",
        )}
      >
        {/* `rounded-lg` (12px) — the system's ceiling for artwork, "makes
            portraits feel like framed prints" (see docs/design-system.md,
            "Radius"). */}
        <div className="w-32 shrink-0 overflow-hidden rounded-lg bg-surface-subtle shadow-sm sm:w-44">
          <div className="relative aspect-2/3">
            {poster ? (
              <Image
                src={poster}
                alt=""
                fill
                priority
                sizes="(min-width: 640px) 176px, 128px"
                className="object-cover"
              />
            ) : (
              <MediaPosterFallback mediaType={mediaType} />
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 text-center sm:pb-1 sm:text-left">
          {children}
        </div>
      </div>
    </div>
  );
}
