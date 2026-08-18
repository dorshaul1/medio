"use client";

import { ArrowLeft, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { KeyboardEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandRow } from "@/features/command-center/command-row";
import { getUpNextCommandDataAction } from "@/features/command-center/command-center-actions";
import {
  LOG_WATCHED_COMMAND,
  NAVIGATION_COMMANDS,
} from "@/features/command-center/static-commands";
import { matchCommands } from "@/features/command-center/match";
import type { Command } from "@/features/command-center/types";
import { LogWatchedResultRow } from "@/features/command-center/log-watched-result-row";
import { buildUpNextCommand } from "@/features/command-center/up-next-command";
import { isNavItemActive } from "@/config/navigation";
import { UnifiedSearchResultRow } from "@/features/discover/unified-search-result-row";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/features/search/recent-searches";
import { getSearchSuggestionsAction } from "@/features/search/search-actions";
import type { ActiveShowContinuation } from "@/server/home/types";
import type { PlanningIntent } from "@/server/planning/types";
import { SEARCH_MIN_QUERY_LENGTH } from "@/server/search/constants";
import type { UnifiedSearchResults } from "@/server/search/types";

const DEBOUNCE_MS = 250;
// A query typed as "watch X"/"log X" almost always means "find X" —
// stripping the verb before searching media is the one deliberate bit of
// intent-parsing this domain does (see docs/search.md, "Command Center");
// everything else is plain deterministic text matching, no NLP/LLM.
const MEDIA_INTENT_PREFIXES = ["watch ", "log "];

function stripMediaIntentPrefix(query: string): string {
  const lower = query.toLowerCase();
  const prefix = MEDIA_INTENT_PREFIXES.find((candidate) => lower.startsWith(candidate));
  return prefix ? query.slice(prefix.length) : query;
}

function focusableResults(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>("[data-search-result]"));
}

// MEDIO's Command Center — search Movies/Shows/People, navigate, and run
// the highest-frequency tracking actions from one keyboard-first overlay
// (see docs/search.md, "Command Center"). Evolved in place from the
// original Search-only overlay rather than a second parallel component —
// the sidebar/mobile triggers, `⌘K`, and this dialog are still exactly
// one implementation (see GlobalSearchProvider). Built on Radix's
// headless Dialog directly (not the shared DialogContent, whose
// centered/max-width chrome is right for a confirmation dialog but not
// this anchored-near-the-top, denser surface) — same real focus-trap/
// Escape/return-focus behavior either way.
//
// Deliberately plain search input + a real list of focusable rows (Links
// or buttons, both marked `data-search-result`), not a simulated ARIA
// combobox/listbox — Arrow Up/Down/Enter/Escape all still work via real
// focus movement between real, independently-tabbable elements rather
// than a synthetic aria-activedescendant relationship.
export function GlobalSearchDialog({
  open,
  onOpenChange,
  previouslyFocused,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previouslyFocused?: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<"search" | "log-watched">("search");
  const [value, setValue] = useState("");
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [defaultSaveIntent, setDefaultSaveIntent] = useState<PlanningIntent>("watchlist");
  const [recentSearches, setRecentSearches] = useState<readonly string[]>([]);
  const [upNext, setUpNext] = useState<ActiveShowContinuation | null>(null);
  // Distinct from `upNext === null` (which also means "resolved, no real
  // Up Next"): reserves the Up Next command's row at a stable height
  // while its fetch is still in flight, so Quick Actions doesn't visibly
  // grow/shift "Log watched" down a beat after everything else is
  // already interactive (see the `useEffect` below).
  const [upNextLoading, setUpNextLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      // Bounded, local-DB-only, and only ever fetched once per open — see
      // command-center-actions.ts. Never blocks the dialog opening: it's
      // fire-and-forget, the Quick Actions section simply gains the Up
      // Next command a beat after everything else is already interactive
      // — `upNextLoading` reserves its row at a stable height for that
      // beat so nothing else visibly shifts once it resolves.
      setUpNextLoading(true);
      getUpNextCommandDataAction().then((result) => {
        setUpNext(result);
        setUpNextLoading(false);
      });
    } else {
      clearTimeout(timeoutRef.current);
      setValue("");
      setResults(null);
      setMode("search");
      setUpNext(null);
      setUpNextLoading(false);
    }
  }, [open]);

  function runSearch(query: string) {
    const searchTerm = stripMediaIntentPrefix(query).trim();
    if (searchTerm.length < SEARCH_MIN_QUERY_LENGTH) {
      setResults(null);
      return;
    }
    addRecentSearch(query.trim());
    const id = ++requestId.current;
    startTransition(async () => {
      const response = await getSearchSuggestionsAction(searchTerm);
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

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  function openLogWatched() {
    setMode("log-watched");
    setValue("");
    setResults(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function backToSearch() {
    setMode("search");
    setValue("");
    setResults(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function goToFullResults(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return;
    addRecentSearch(trimmed);
    close();
    router.push(`/discover?q=${encodeURIComponent(stripMediaIntentPrefix(trimmed))}`);
  }

  function handleResultNavigate() {
    if (value.trim()) addRecentSearch(value.trim());
    close();
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      if (mode === "search") {
        event.preventDefault();
        goToFullResults(value);
      }
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
  // isn't itself an interactive control.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above.
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = focusableResults(container);
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
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

  const allCommands = useMemo<readonly Command[]>(() => {
    const dynamic = upNext ? [buildUpNextCommand(upNext, close)] : [];
    return [...dynamic, LOG_WATCHED_COMMAND, ...NAVIGATION_COMMANDS];
  }, [upNext, close]);

  const matchedCommands = useMemo(
    () => (mode === "search" ? matchCommands(allCommands, value) : []),
    [allCommands, value, mode],
  );

  const runContext = { openLogWatched, close };

  const hasQuery = stripMediaIntentPrefix(value).trim().length >= SEARCH_MIN_QUERY_LENGTH;
  const hasAnyMediaResult = Boolean(results && results.results.length > 0);
  // A strong command match (an exact/prefix hit on a label or alias —
  // "taste", "preferences", "user", "releases", "log") is almost always
  // exactly what the user meant, so it leads the list; a merely-word-
  // boundary/substring match trails media results instead, since a
  // clear content search ("breaking bad") shouldn't be pushed down by a
  // coincidental partial command match (see docs/search.md, "Ranking").
  const strongCommandMatches = matchedCommands.filter((match) => match.score >= 0.75);
  const weakCommandMatches = matchedCommands.filter((match) => match.score < 0.75);
  const hasAnyResult = hasAnyMediaResult || matchedCommands.length > 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (!previouslyFocused?.current) return;
            event.preventDefault();
            previouslyFocused.current.focus();
          }}
          // Radix's own documented hook for "intercept Escape instead of
          // letting it close the dialog" — a plain `preventDefault` on a
          // child input's `onKeyDown` isn't enough, since Radix's own
          // Escape handling lives on the Content itself, not something a
          // descendant's synthetic event can out-race (see docs/search.md,
          // "Keyboard UX": Escape returns from the nested Log Watched step
          // first, then closes on a second press).
          onEscapeKeyDown={(event) => {
            if (mode === "log-watched") {
              event.preventDefault();
              backToSearch();
            }
          }}
          className="fixed inset-x-0 top-0 z-50 flex max-h-dvh flex-col gap-0 border-b border-border bg-surface-elevated shadow-sm outline-none sm:top-[10vh] sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:rounded-lg sm:border"
        >
          <DialogPrimitive.Title className="sr-only">
            {mode === "log-watched" ? "Log something watched" : "Search and commands"}
          </DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-border p-3">
            {mode === "log-watched" ? (
              <IconButton
                aria-label="Back to search"
                variant="ghost"
                size="sm"
                onClick={backToSearch}
              >
                <ArrowLeft />
              </IconButton>
            ) : (
              <Search aria-hidden="true" className="ml-1 size-4 shrink-0 text-muted-foreground" />
            )}
            <Input
              ref={inputRef}
              type="text"
              role="searchbox"
              aria-label={
                mode === "log-watched" ? "Search Movies and Shows to log" : "Search and commands"
              }
              placeholder={
                mode === "log-watched"
                  ? "Search Movies and Shows to log…"
                  : "Search or run a command…"
              }
              autoComplete="off"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (mode === "log-watched") {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = setTimeout(() => runSearch(event.target.value), DEBOUNCE_MS);
                } else {
                  handleChange(event.target.value);
                }
              }}
              onKeyDown={handleInputKeyDown}
              className="h-9 border-none px-0 shadow-none focus-visible:ring-0"
            />
            <DialogPrimitive.Close asChild>
              <IconButton aria-label="Close" variant="ghost" size="sm">
                <X />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          <div ref={resultsRef} className="max-h-[70vh] overflow-y-auto p-2 sm:max-h-[60vh]">
            <div aria-live="polite" className="sr-only">
              {mode === "log-watched"
                ? hasAnyMediaResult
                  ? `${results?.results.length} results`
                  : ""
                : hasQuery && (results || matchedCommands.length > 0)
                  ? hasAnyResult
                    ? "Results updated"
                    : `No results for ${value}`
                  : ""}
            </div>

            {mode === "log-watched" ? (
              <LogWatchedResults
                results={results}
                isPending={isPending}
                value={value}
                onLogged={close}
                onNavigate={handleResultNavigate}
              />
            ) : !hasQuery ? (
              <CommandCenterIdleState
                pathname={pathname}
                upNext={upNext}
                upNextLoading={upNextLoading}
                recentSearches={recentSearches}
                runContext={runContext}
                onSelectRecent={(query) => {
                  setValue(query);
                  runSearch(query);
                }}
                onClearRecent={() => {
                  clearRecentSearches();
                  setRecentSearches([]);
                }}
              />
            ) : !results && isPending && matchedCommands.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">Searching…</p>
            ) : !hasAnyResult ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{value}&rdquo;.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  {strongCommandMatches.map(({ command }) => (
                    <CommandRow key={command.id} command={command} runContext={runContext} />
                  ))}
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
                  {weakCommandMatches.map(({ command }) => (
                    <CommandRow key={command.id} command={command} runContext={runContext} />
                  ))}
                </div>

                {hasAnyMediaResult ? (
                  <button
                    type="button"
                    onClick={() => goToFullResults(value)}
                    className="mx-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    See all results for &ldquo;{value}&rdquo;
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LogWatchedResults({
  results,
  isPending,
  value,
  onLogged,
  onNavigate,
}: {
  results: UnifiedSearchResults | null;
  isPending: boolean;
  value: string;
  onLogged: () => void;
  onNavigate: () => void;
}) {
  const media = (results?.results ?? []).filter((result) => result.kind !== "person");

  if (value.trim().length < SEARCH_MIN_QUERY_LENGTH) {
    return (
      <p className="px-2 py-8 text-center text-sm text-muted-foreground">
        Search for a Movie or Show to log as watched.
      </p>
    );
  }
  if (!results && isPending) {
    return <p className="px-2 py-8 text-center text-sm text-muted-foreground">Searching…</p>;
  }
  if (media.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-sm text-muted-foreground">
        No Movies or Shows found for &ldquo;{value}&rdquo;.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {media.map((result) => (
        <LogWatchedResultRow
          key={`${result.kind}:${result.media.id}`}
          media={result.media}
          onLogged={onLogged}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

// Before typing anything — curated Quick Actions, Navigate (minus
// wherever the user already is), and Recent searches, never a "type
// something to search" empty state or a dozen-command sitemap (see
// docs/search.md, "Command Center", "Default state").
function CommandCenterIdleState({
  pathname,
  upNext,
  upNextLoading,
  recentSearches,
  runContext,
  onSelectRecent,
  onClearRecent,
}: {
  pathname: string;
  upNext: ActiveShowContinuation | null;
  upNextLoading: boolean;
  recentSearches: readonly string[];
  runContext: { openLogWatched: () => void; close: () => void };
  onSelectRecent: (query: string) => void;
  onClearRecent: () => void;
}) {
  const quickActions: Command[] = [
    ...(upNext ? [buildUpNextCommand(upNext, runContext.close)] : []),
    LOG_WATCHED_COMMAND,
  ];
  const navCommands = NAVIGATION_COMMANDS.filter(
    (command) =>
      command.group === "navigate" &&
      !("href" in command && isNavItemActive(pathname, command.href)),
  );

  return (
    <div className="flex flex-col gap-4 px-1 py-2">
      <IdleSection title="Quick actions">
        {/* Reserves Up Next's own row at its real height while its fetch
            is still in flight — without this, "Log watched" briefly
            renders alone and then gets pushed down a beat later once Up
            Next resolves, a visible jump right after opening (see the
            `upNextLoading` comment in global-search-dialog.tsx). */}
        {upNextLoading ? <CommandRowSkeleton /> : null}
        {quickActions.map((command) => (
          <CommandRow key={command.id} command={command} runContext={runContext} />
        ))}
      </IdleSection>

      {/* Desktop-only — mobile already has its own bottom nav for these
          exact destinations; repeating all eight here would read as a
          sitemap dropped into a touch surface, not the purpose-built
          mobile Search this app's own PWA rules call for (see
          docs/search.md, "Mobile"). Quick actions above stays shared:
          a couple of real shortcuts, not a navigation dump. */}
      <div className="hidden md:block">
        <IdleSection title="Navigate">
          {navCommands.map((command) => (
            <CommandRow key={command.id} command={command} runContext={runContext} />
          ))}
        </IdleSection>
      </div>

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
    </div>
  );
}

function IdleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="px-1 pb-1 text-xs font-medium text-muted-foreground uppercase">{title}</h2>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

// Matches `CommandRow`'s own box model exactly (p-2, gap-3, size-4 icon,
// text-sm label) so the real row lands at the same height once it
// resolves — the placeholder's job is to occupy the space, not to be
// noticed.
function CommandRowSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 p-2">
      <Skeleton className="size-4 shrink-0 rounded-sm" />
      <Skeleton className="h-4 w-32 rounded-sm" />
    </div>
  );
}
