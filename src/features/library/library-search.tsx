"use client";

import { Search, X } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 250;

// Library's own search — searches only this user's saved/tracked media,
// never the global TMDB catalog (that's Discover's `DiscoverSearchInput`,
// a deliberately separate component/concept — see docs/library.md,
// "Search"). Same "committed state lives in the URL, this component only
// owns the transient typed value" shape as Discover's search input, with
// a shorter debounce: Library's own scan is bounded to the user's
// personal collection (see `LIBRARY_SEARCH_CANDIDATE_CAP`), so it can
// afford to feel snappier than a query that ultimately reaches a
// provider. Changing the query also drops any existing `?count=` — a new
// search starts back at the first page of its own results, and clears
// `?sort=` since search results are relevance-ranked, not recency/added-
// ranked.
export function LibrarySearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  function commit(nextValue: string) {
    clearTimeout(timeoutRef.current);
    const trimmed = nextValue.trim();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("count");
    params.delete("sort");
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}` as Route, { scroll: false });
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
    <div className="relative w-full sm:max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="text"
        role="searchbox"
        aria-label="Search your Library"
        placeholder="Search your Library"
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
