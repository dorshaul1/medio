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
