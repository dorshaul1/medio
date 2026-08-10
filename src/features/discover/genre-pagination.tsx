import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DiscoverSort } from "@/server/tmdb/queries";

// Traditional Previous/Next pagination, not "Load more" or infinite
// scroll — every page is a real, shareable, back/forward-friendly URL
// (see docs/architecture.md), and needs no client JavaScript at all.
export function GenrePagination({
  basePath,
  sort,
  page,
  totalPages,
}: {
  basePath: string;
  sort: DiscoverSort;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  function hrefFor(targetPage: number): Route {
    // Built from runtime values (basePath/sort/page), not a literal — see
    // the comment on mediaHref in features/media/media-route.ts for why
    // this needs the same `as Route` escape hatch.
    return `${basePath}?sort=${sort}&page=${targetPage}` as Route;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4">
      {hasPrevious ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={hrefFor(page - 1)}>Previous</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      {hasNext ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={hrefFor(page + 1)}>Next</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </nav>
  );
}
