"use client";

import { Search } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useGlobalSearch } from "@/features/search/global-search-context";
import { cn } from "@/lib/utils";

// DesktopNav's own entry point — a full-width row matching the nav's own
// link rows (see CLAUDE.md, "Search shortcuts in app": a clear nav
// action, not a sixth destination), with a quiet ⌘K hint. Real button
// semantics (this opens an overlay in place, it doesn't navigate).
export function GlobalSearchNavTrigger() {
  const { setOpen } = useGlobalSearch();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors select-none",
        "hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <Search aria-hidden="true" strokeWidth={1.75} className="size-[1.1rem]" />
      <span className="flex-1 text-left">Search</span>
      {/* A styled `<span>`, not `<kbd>` — this button isn't itself
          focusable-content-bearing markup that benefits from the
          semantic distinction, and `aria-hidden` (this hint is purely
          decorative; "Search" alone is already the real accessible
          name) is only valid on a non-focusable element. */}
      <span
        aria-hidden="true"
        className="rounded border border-border px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground/70"
      >
        ⌘K
      </span>
    </button>
  );
}

// The mobile header strip's entry point — an icon button beside the
// wordmark/account control, same as any other header icon action (see
// AppShell). No keyboard hint on mobile; there's no keyboard.
export function GlobalSearchIconTrigger() {
  const { setOpen } = useGlobalSearch();

  return (
    <IconButton
      aria-label="Search Movies, Shows and People"
      variant="ghost"
      onClick={() => setOpen(true)}
    >
      <Search />
    </IconButton>
  );
}
