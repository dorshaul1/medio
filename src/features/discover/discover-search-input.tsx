"use client";

import { Search, X } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 350;

// Committed search state lives in the URL (`?q=`) — this component only
// owns the transient "what's currently typed" state and debounces how
// often that becomes a navigation. Enter commits immediately; Escape
// clears immediately. No fetching happens here at all: URL changes make
// the Discover page (a Server Component) re-render with the new query —
// see src/app/(app)/discover/page.tsx and search-results.tsx.
export function DiscoverSearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL is the source of truth — keep the field in sync with it (e.g.
  // browser back/forward landing on a different ?q=).
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  function commit(nextValue: string) {
    clearTimeout(timeoutRef.current);
    const trimmed = nextValue.trim();
    const search = trimmed ? `?q=${encodeURIComponent(trimmed)}` : "";
    // `pathname` is a runtime string, not a literal — see the comment on
    // mediaHref for why this needs the same `as Route` escape hatch.
    router.replace(`${pathname}${search}` as Route, { scroll: false });
  }

  function handleChange(nextValue: string) {
    setValue(nextValue);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => commit(nextValue), DEBOUNCE_MS);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      commit(value);
    } else if (event.key === "Escape" && value) {
      event.preventDefault();
      setValue("");
      commit("");
    }
  }

  function handleClear() {
    setValue("");
    commit("");
  }

  return (
    <div className="relative w-full max-w-md">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        // A plain text input with an explicit searchbox role, rather than
        // type="search" — avoids the browser's own native clear-icon
        // doubling up with the one rendered below.
        type="text"
        role="searchbox"
        aria-label="Search movies and TV shows"
        placeholder="Search movies and TV shows"
        autoComplete="off"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className="h-10 pr-9 pl-9"
      />
      {value ? (
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Clear search"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={handleClear}
        >
          <X />
        </IconButton>
      ) : null}
    </div>
  );
}
