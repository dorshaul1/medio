"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";

// A fixed dark scrim, not a theme token — the same reasoning as Dialog's
// overlay (see design-system.md): this floats over arbitrary, unpredictable
// poster colors, not app chrome, so it needs to read clearly against any
// of them rather than shift with light/dark mode. rounded-full is a
// deliberate local exception too — a compact floating utility control over
// artwork reads as an object in its own right, not a "container", so the
// system's card/button radius rule doesn't apply the same way here.
const CONTROL_CLASS =
  "absolute top-[38%] z-10 hidden size-9 -translate-y-1/2 scale-90 rounded-full bg-black/55 text-white opacity-0 shadow-sm transition-[opacity,transform] duration-200 hover:bg-black/70 group-hover/row:scale-100 group-hover/row:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 lg:flex";

// The only client boundary a media row needs — MediaCollectionRow stays a
// Server Component; the poster tiles it renders are passed through here as
// children. Native scroll remains the real interaction on every input
// (trackpad, touch, wheel); this only adds an optional pointer affordance
// for desktop mice, which have no native horizontal-scroll gesture.
export function MediaRowScroller({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // A few pixels of slack — avoids the buttons flickering at rest due
    // to sub-pixel scroll-width rounding.
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, [updateEdges]);

  function scroll(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    // /row namespaces this group from any ancestor group (e.g. MediaPoster's
    // own hover group) so they never cross-trigger each other.
    <div className="group/row relative">
      <div
        ref={scrollerRef}
        className="scrollbar-media -mx-5 flex gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2.5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10"
      >
        {children}
      </div>

      {/* Desktop-only (lg:flex): mouse/trackpad users get a pointer
          affordance; touch devices never render these at all, since
          nothing here is [hidden] on lg and below — it's not just
          visually hidden, it's not in the layout. Revealed on row hover
          or when a button itself has keyboard focus, never permanently
          visible — a resting row should look like plain artwork, not a
          UI chrome apparatus. */}
      {canScrollLeft ? (
        <IconButton
          aria-label="Scroll left"
          variant="ghost"
          className={`${CONTROL_CLASS} left-2`}
          onClick={() => scroll(-1)}
        >
          <ChevronLeft strokeWidth={2.25} />
        </IconButton>
      ) : null}
      {canScrollRight ? (
        <IconButton
          aria-label="Scroll right"
          variant="ghost"
          className={`${CONTROL_CLASS} right-2`}
          onClick={() => scroll(1)}
        >
          <ChevronRight strokeWidth={2.25} />
        </IconButton>
      ) : null}
    </div>
  );
}
