"use client";

import { Check, ChevronLeft } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  clampSwipeTravel,
  isPastCommitThreshold,
  resolveSwipeIntent,
  SWIPE_MAX_TRAVEL_PX,
  swipeProgress,
  type SwipeIntent,
} from "./swipe-math";

// Tailwind's own `md` breakpoint — matches every other mobile/desktop
// dual-composition split in the app (DesktopNav/MobileNav, ...). The
// gesture simply doesn't engage above it; desktop keeps using
// `LibraryShowQuickAction`'s persistent button.
const DESKTOP_BREAKPOINT_QUERY = "(min-width: 768px)";

// Mobile Library's swipe-to-watch row (see docs/library.md, "Swipe to
// watch") — wraps a tracked show's translatable row content
// (poster/title/detail) and reveals a primary-color "mark watched" layer
// underneath as the user drags it right. Never a separate tracking
// implementation: `onCommit` is always `useMarkNextEpisodeWatched`'s own
// `commit()`, the exact same call the desktop/checkbox `IconButton`
// makes.
//
// Gesture intent is resolved from real movement (`resolveSwipeIntent`)
// before anything visually moves — a drag that turns out to be a
// vertical scroll never touches this row's position, so scrolling the
// list past a swipeable row stays completely natural. Once locked
// horizontal, the content follows the finger 1:1 (`clampSwipeTravel`),
// clamped to the reveal layer's own width and to rightward drags only
// (leftward is never claimed — see swipe-math.ts, "swipe right to check
// off" is the more natural convention for a positive completion action).
// Release past the commit threshold holds the full reveal and calls
// `onCommit`; short of it, both layers animate back to rest and nothing
// happens. A failed mutation restores the row and marks `failed` so the
// caller can surface it.
// A one-time, deliberately brief reveal — well short of the commit
// threshold, so it can never be mistaken for an actual watched action —
// used only by the first-use discoverability hint (see
// `playHintOnMount` below).
const HINT_TRAVEL_PX = SWIPE_MAX_TRAVEL_PX * 0.4;

export function EpisodeSwipeRow({
  children,
  onCommit,
  disabled,
  playHintOnMount,
}: {
  children: ReactNode;
  onCommit: () => Promise<boolean>;
  disabled?: boolean;
  // Plays a brief, controlled reveal-and-settle once on mount — MEDIO's
  // one-time swipe discoverability affordance (see docs/library.md,
  // "Swipe discoverability"). The caller (`TrackedShowLibraryRow`)
  // guarantees this is `true` for at most one row per Library page load,
  // never repeated once the hint's own preference flips.
  playHintOnMount?: boolean;
}) {
  const [travel, setTravel] = useState(0);
  const [phase, setPhase] = useState<"idle" | "dragging" | "settling" | "committing">("idle");
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const intentRef = useRef<SwipeIntent>("pending");
  const pointerIdRef = useRef<number | null>(null);

  // A phase change to "settling" is purely a CSS-transition cue (adds
  // the `duration-*` class so the snap-back/reveal is animated instead
  // of instant) — this timeout returns it to "idle" once that
  // transition has actually finished, matching the same duration.
  useEffect(() => {
    if (phase !== "settling") return;
    const id = setTimeout(() => setPhase("idle"), 220);
    return () => clearTimeout(id);
  }, [phase]);

  // The hint itself: reveal partway, hold briefly, settle back — never
  // triggers `onCommit`. Respects reduced motion for free: the CSS
  // transition classes this reuses are already neutralized by the app's
  // global `prefers-reduced-motion`/`data-motion="reduced"` overrides
  // (globals.css), so the row simply appears at rest without extra
  // branching here.
  useEffect(() => {
    if (!playHintOnMount) return;
    const revealId = setTimeout(() => {
      setPhase("settling");
      setTravel(HINT_TRAVEL_PX);
    }, 400);
    const settleId = setTimeout(() => {
      setPhase("settling");
      setTravel(0);
    }, 1100);
    return () => {
      clearTimeout(revealId);
      clearTimeout(settleId);
    };
  }, [playHintOnMount]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || phase !== "idle") return;
    if (window.matchMedia(DESKTOP_BREAKPOINT_QUERY).matches) return;
    startRef.current = { x: event.clientX, y: event.clientY };
    intentRef.current = "pending";
    pointerIdRef.current = event.pointerId;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    if (!start || phase === "committing") return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (intentRef.current === "pending") {
      intentRef.current = resolveSwipeIntent(dx, dy);
      if (intentRef.current === "vertical") {
        // A real vertical scroll — release our own claim on this
        // pointer immediately and never touch the row's position again
        // for this gesture. The browser's native scroll (never
        // prevented above) already has it.
        startRef.current = null;
        return;
      }
      if (intentRef.current === "horizontal") {
        // Not implemented in every environment (jsdom, some older
        // WebViews) — the gesture still works without it, just without
        // the guarantee that a pointer dragged outside this element's
        // bounds keeps reporting to it.
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setPhase("dragging");
      }
    }

    if (intentRef.current === "horizontal") {
      event.preventDefault();
      setTravel(clampSwipeTravel(dx));
    }
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (intentRef.current !== "horizontal") {
      startRef.current = null;
      return;
    }
    startRef.current = null;
    if (
      pointerIdRef.current !== null &&
      event.currentTarget.hasPointerCapture?.(pointerIdRef.current)
    ) {
      event.currentTarget.releasePointerCapture(pointerIdRef.current);
    }

    setTravel((current) => {
      if (isPastCommitThreshold(current)) {
        void commit();
        return SWIPE_MAX_TRAVEL_PX;
      }
      setPhase("settling");
      return 0;
    });
  }

  async function commit() {
    setPhase("committing");
    const succeeded = await onCommit();
    if (!succeeded) {
      // Restore the row — never leave a false "watched" state on
      // screen, and never touch the list's own scroll position (nothing
      // here scrolls anything).
      setPhase("settling");
      setTravel(0);
    }
    // On success the parent re-renders without this episode eligible
    // anymore (the row's own key changes upstream), so there's nothing
    // further to animate here.
  }

  const progress = swipeProgress(travel);

  return (
    <div className="relative min-w-0 flex-1 touch-pan-y overflow-hidden rounded-md">
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-start bg-primary pl-6"
        style={{ opacity: progress }}
      >
        <Check
          className="size-5 text-primary-foreground"
          style={{ transform: `scale(${0.6 + 0.4 * progress})` }}
        />
      </div>
      <div
        data-swipe-surface
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "relative bg-background",
          phase !== "dragging" && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translateX(${travel}px)` }}
      >
        {children}
        {/* A quiet, permanent (never animated on its own) affordance —
            not the one-time hint above, which plays once and is gone;
            this is what tells every visit afterward "this row responds
            to a swipe" without a tutorial banner. Deliberately just one
            small, muted mark — a colored fill/gradient here would read
            as decoration competing with the reveal layer's own real
            primary-color moment once a drag actually starts (see
            CLAUDE.md, "Content brings the color"). Fades out as a real
            drag takes over. */}
        <ChevronLeft
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-muted-foreground/50 md:hidden"
          style={{ opacity: 1 - progress * 2 }}
        />
      </div>
    </div>
  );
}
