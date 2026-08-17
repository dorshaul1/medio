"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlobalSearchContext } from "@/features/search/global-search-context";
import { GlobalSearchDialog } from "@/features/search/global-search-dialog";

// Mounted once, at the app shell root — owns the Command Center's open
// state, the actual overlay, and the ⌘K/Ctrl+K shortcut (desktop only;
// there's no keyboard on mobile — see docs/search.md, "Command Center").
// The sidebar/mobile-header triggers and ⌘K all open this exact same
// instance — one canonical desktop search/command experience, never a
// separate Search modal plus a separate command palette.
export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  // GlobalSearch's own triggers (the desktop nav row, the mobile header
  // icon) are plain buttons, not Radix `Dialog.Trigger` — Radix's own
  // automatic "return focus to whatever opened the dialog" only tracks
  // its own Trigger component, so this has to do that bookkeeping itself:
  // whichever element had focus right before opening is exactly the
  // element to return focus to on close.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const setOpen = useCallback((next: boolean) => {
    setOpenState((current) => {
      if (next && !current) {
        previouslyFocused.current = document.activeElement as HTMLElement | null;
      }
      // Restoring focus on close happens in GlobalSearchDialog's own
      // `onCloseAutoFocus` (via the same `previouslyFocused` ref), not
      // here — Radix's Dialog.Content runs its own focus-restore on
      // unmount, and doing it here too would race that, sometimes losing.
      return next;
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setOpen(!open);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  return (
    <GlobalSearchContext.Provider value={{ open, setOpen }}>
      {children}
      <GlobalSearchDialog
        open={open}
        onOpenChange={setOpen}
        previouslyFocused={previouslyFocused}
      />
    </GlobalSearchContext.Provider>
  );
}
