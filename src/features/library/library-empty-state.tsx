import type { Route } from "next";
import Link from "next/link";

// A brand-new (or filtered-to-nothing) Library — restrained, not a giant
// icon-in-a-circle with marketing copy (see docs/library.md, "Empty
// states"). `heading`/`description` differ between a genuinely empty
// Library and an empty filter result — see the two callers.
export function LibraryEmptyState({
  heading,
  description,
  showDiscoverLink = false,
}: {
  heading: string;
  description: string;
  showDiscoverLink?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 py-10">
      <p className="text-sm font-medium text-foreground">{heading}</p>
      <p className="text-sm text-muted-foreground">
        {description}
        {showDiscoverLink ? (
          <>
            {" "}
            <Link
              href="/discover"
              className="rounded-sm text-foreground underline outline-none hover:text-foreground/80 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Browse Discover
            </Link>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}

// A Library search with no matches — distinct copy from a plain empty
// filter (see docs/library.md, "Search empty state"): it names the
// query, and offers an explicit, opt-in path to global Search rather
// than silently widening scope to the TMDB catalog (see CLAUDE.md,
// "Library search searches user-owned Library state, not the global TMDB
// catalog").
export function LibrarySearchEmptyState({ query }: { query: string }) {
  const discoverHref = `/discover?q=${encodeURIComponent(query)}` as Route;

  return (
    <div className="flex flex-col gap-2 py-10">
      <p className="text-sm font-medium text-foreground">
        Nothing in your Library matches &ldquo;{query}&rdquo;.
      </p>
      <p className="text-sm text-muted-foreground">
        <Link
          href={discoverHref}
          className="rounded-sm text-foreground underline outline-none hover:text-foreground/80 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Search MEDIO for &ldquo;{query}&rdquo;
        </Link>
      </p>
    </div>
  );
}
