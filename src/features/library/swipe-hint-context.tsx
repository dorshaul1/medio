"use client";

import { createContext, useContext, useRef } from "react";

// A very small provider so exactly one swipeable row per Library page
// load gets to play the one-time swipe discoverability demo (see
// docs/library.md, "Swipe discoverability") — never every eligible row,
// never repeated. `claim()` returns `true` for the first caller only;
// every row after that (even ones that mount later, e.g. via "Show
// more") gets `false`. A `useRef` scoped to this provider, not module
// state — resets naturally on every real page load/navigation, and
// never leaks between different users' sessions or different renders of
// the same list.
const SwipeHintContext = createContext<{ claim: () => boolean } | null>(null);

export function SwipeHintProvider({ children }: { children: React.ReactNode }) {
  const claimedRef = useRef(false);

  function claim(): boolean {
    if (claimedRef.current) return false;
    claimedRef.current = true;
    return true;
  }

  return <SwipeHintContext.Provider value={{ claim }}>{children}</SwipeHintContext.Provider>;
}

// Outside a provider (shouldn't happen in product code, but a stray call
// site or a test rendering the row in isolation), nothing claims the
// hint — no demo plays, which is the safe default.
export function useClaimSwipeHint(): () => boolean {
  const context = useContext(SwipeHintContext);
  return context?.claim ?? (() => false);
}
