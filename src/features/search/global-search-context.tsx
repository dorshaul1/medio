"use client";

import { createContext, useContext } from "react";

type GlobalSearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

// A tiny Context rather than prop-drilling — GlobalSearch's trigger lives
// in two genuinely different places in the DOM (DesktopNav's rail, the
// mobile header strip; see docs/search.md),
// both needing to open the exact same overlay instance/state, not two
// independent ones.
export const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function useGlobalSearch(): GlobalSearchContextValue {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
  }
  return context;
}
