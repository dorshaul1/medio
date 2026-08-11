"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { KeyboardEvent, RefObject } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { UnifiedSearchResultRow } from "@/features/discover/unified-search-result-row";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/features/search/recent-searches";
import { getSearchSuggestionsAction } from "@/features/search/search-actions";
import type { PlanningIntent } from "@/server/planning/types";
import { SEARCH_MIN_QUERY_LENGTH } from "@/server/search/constants";
import type { UnifiedSearchResults } from "@/server/search/types";

const DEBOUNCE_MS = 250;

function focusableResults(container: HTMLElement | null): HTMLAnchorElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLAnchorElement>("a[data-search-result]"));
}

// GlobalSearch's overlay — the compact, fast "search-as-you-type" surface
// (see docs/search.md). Built on Radix's
// headless Dialog directly (not the shared DialogContent, whose centered/
// max-width chrome is right for a confirmation dialog but not for a
// search surface that should anchor near the top and go closer to full-
// screen on mobile — see "Mobile Search" in the product spec) — same
// real focus-trap/Escape/return-focus behavior either way.
//
// Deliberately plain search input + a real list of `<Link>`s, not a
// simulated ARIA combobox/listbox (see the product spec: "do not fake
// combobox semantics... a normal search input + result list may be more
// robust") — Arrow Up/Down/Enter/Escape all still work, just via real
// focus movement between real, independently-tabbable links rather than
// a synthetic aria-activedescendant relationship.
export function GlobalSearchDialog({
  open,
  onOpenChange,
  previouslyFocused,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Whichever element had focus right before opening (see
  // GlobalSearchProvider) — restored in `onCloseAutoFocus` below, which
  // is the one place that reliably wins over Radix's own internal
  // focus-restore-on-unmount rather than racing it. Optional: a caller
  // testing this component standalone (no real trigger to return to)
  // can omit it.
  previouslyFocused?: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [defaultSaveIntent, setDefaultSaveIntent] = useState<PlanningIntent>("watchlist");
  const [recentSearches, setRecentSearches] = useState<readonly string[]>([]);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
    } else {
      // Fresh state each time it opens — a stale previous query/result
      // set flashing before the new one loads would be more confusing
      // than a clean slate.
      clearTimeout(timeoutRef.current);
      setValue("");
      setResults(null);
    }
  }, [open]);

  function runSearch(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) {
      setResults(null);
      return;
    }
    // A query is "recent" the moment it's actually searched — not only
    // once a result is clicked (closing without picking anything is
    // still a real search worth remembering for next time) or the
    // "See all results" escape hatch. Debounced already, so this is
    // never once per keystroke.
    addRecentSearch(trimmed);
    const id = ++requestId.current;
    startTransition(async () => {
      const response = await getSearchSuggestionsAction(trimmed);
      // A slower, now-superseded request must never clobber a newer one's
      // results — only the latest request in flight is ever applied.
      if (requestId.current !== id) return;
      setResults(response.results);
      setDefaultSaveIntent(response.defaultSaveIntent);
    });
  }

  function handleChange(next: string) {
    setValue(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => runSearch(next), DEBOUNCE_MS);
  }

  function goToFullResults(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return;
    addRecentSearch(trimmed);
    onOpenChange(false);
    router.push(`/discover?q=${encodeURIComponent(trimmed)}`);
  }

  function handleResultNavigate() {
    if (value.trim()) addRecentSearch(value.trim());
    onOpenChange(false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      goToFullResults(value);
    } else if (event.key === "ArrowDown") {
      const first = focusableResults(resultsRef.current)[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  // A native listener on the results container, not a JSX `onKeyDown` on
  // a plain `<div>` — this moves focus *between other elements*, it
  // isn't itself an interactive control, so it shouldn't carry its own
  // interactive-element semantics (see the a11y lint this avoids). Depends
  // on `open` (unread inside the effect) because Radix only mounts this
  // ref's DOM node while the dialog is open — without it, the effect
  // would run once against a still-null ref and never retry.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above.
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = focusableResults(container);
      const currentIndex = items.indexOf(document.activeElement as HTMLAnchorElement);
      if (currentIndex === -1) return;

      event.preventDefault();
      if (event.key === "ArrowDown") {
        items[currentIndex + 1]?.focus();
      } else if (currentIndex === 0) {
        inputRef.current?.focus();
      } else {
        items[currentIndex - 1]?.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const hasQuery = value.trim().length >= SEARCH_MIN_QUERY_LENGTH;
  const hasAnyResult = Boolean(results && results.results.length > 0);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          // Overrides Radix's own default (return focus to whatever was
          // focused when this Content mounted) with the trigger
          // GlobalSearchProvider actually captured — the two would
          // usually agree, but this is the one place that reliably wins
          // rather than racing a second, separate focus-restore attempt.
          onCloseAutoFocus={(event) => {
            if (!previouslyFocused?.current) return;
            event.preventDefault();
            previouslyFocused.current.focus();
          }}
          className="fixed inset-x-0 top-0 z-50 flex max-h-dvh flex-col gap-0 border-b border-border bg-surface-elevated shadow-sm outline-none sm:top-[10vh] sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:rounded-lg sm:border"
        >
          <DialogPrimitive.Title className="sr-only">
            Search Movies, Shows and People
          </DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Search aria-hidden="true" className="ml-1 size-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              role="searchbox"
              aria-label="Search Movies, Shows and People"
              placeholder="Search Movies, Shows and People"
              autoComplete="off"
              value={value}
              onChange={(event) => handleChange(event.target.value)}
              onKeyDown={handleInputKeyDown}
              className="h-9 border-none px-0 shadow-none focus-visible:ring-0"
            />
            <DialogPrimitive.Close asChild>
              <IconButton aria-label="Close search" variant="ghost" size="sm">
                <X />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          <div ref={resultsRef} className="max-h-[70vh] overflow-y-auto p-2 sm:max-h-[60vh]">
            <div aria-live="polite" className="sr-only">
              {hasQuery && results
                ? hasAnyResult
                  ? `${results.results.length} results`
                  : `No results for ${value}`
                : ""}
            </div>

            {!hasQuery ? (
              <GlobalSearchIdleState
                recentSearches={recentSearches}
                onSelectRecent={(query) => {
                  setValue(query);
                  runSearch(query);
                }}
                onClearRecent={() => {
                  clearRecentSearches();
                  setRecentSearches([]);
                }}
                onNavigate={() => onOpenChange(false)}
              />
            ) : !results && isPending ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">Searching…</p>
            ) : !hasAnyResult ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No Movies, Shows or People found for &ldquo;{value}&rdquo;.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {/* One continuous cross-type ranked list — see
                    docs/search.md, "Unified search ranking".
                    Deliberately no per-type section headers: Movies,
                    Shows, and People compete for position on relevance
                    alone, and grouping them back into sections here would
                    silently reintroduce the exact type-priority ordering
                    the ranking itself is designed not to have. */}
                <div className="flex flex-col">
                  {results?.results.map((result) => (
                    <UnifiedSearchResultRow
                      key={
                        result.kind === "person"
                          ? `person:${result.person.id}`
                          : `${result.kind}:${result.media.id}`
                      }
                      result={result}
                      defaultSaveIntent={defaultSaveIntent}
                      onNavigate={handleResultNavigate}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => goToFullResults(value)}
                  className="mx-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  See all results for &ldquo;{value}&rdquo;
                </button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Before typing anything — recent searches (if any) plus a couple of
// quick Discover entry points, not a "type something to search" empty
// state (see the product spec, "Search Empty State").
function GlobalSearchIdleState({
  recentSearches,
  onSelectRecent,
  onClearRecent,
  onNavigate,
}: {
  recentSearches: readonly string[];
  onSelectRecent: (query: string) => void;
  onClearRecent: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 px-1 py-2">
      {recentSearches.length > 0 ? (
        <div>
          <div className="flex items-center justify-between px-1 pb-1">
            <h2 className="text-xs font-medium text-muted-foreground uppercase">Recent searches</h2>
            <button
              type="button"
              onClick={onClearRecent}
              className="rounded-sm text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Clear
            </button>
          </div>
          <ul className="flex flex-col">
            {recentSearches.map((query) => (
              <li key={query}>
                <button
                  type="button"
                  onClick={() => onSelectRecent(query)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Search aria-hidden="true" className="size-3.5 text-muted-foreground" />
                  {query}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="px-1 pb-1 text-xs font-medium text-muted-foreground uppercase">
          Browse Discover
        </h2>
        <div className="flex flex-col">
          <Link
            href="/discover?type=movies"
            onClick={onNavigate}
            className="rounded-md px-2 py-2 text-sm text-foreground outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Movies
          </Link>
          <Link
            href="/discover?type=shows"
            onClick={onNavigate}
            className="rounded-md px-2 py-2 text-sm text-foreground outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Shows
          </Link>
        </div>
      </div>
    </div>
  );
}
