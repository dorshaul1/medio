import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { SeasonSummary } from "@/server/media/types";

// Previous/Next follow the season list's own display order (see
// sortSeasons) — Specials sits after the last regular season, so "Next"
// from the final regular season goes to Specials when one exists, and
// "Previous" from Specials returns to it. Real links, not client-side
// button handlers — keyboard/no-JS-friendly, same reasoning as
// GenrePagination's Previous/Next.
export function SeasonAdjacentNav({
  showId,
  sortedSeasons,
  currentSeasonNumber,
}: {
  showId: number;
  sortedSeasons: readonly SeasonSummary[];
  currentSeasonNumber: number;
}) {
  const index = sortedSeasons.findIndex((season) => season.seasonNumber === currentSeasonNumber);
  const previous = index > 0 ? sortedSeasons[index - 1] : undefined;
  const next =
    index >= 0 && index < sortedSeasons.length - 1 ? sortedSeasons[index + 1] : undefined;

  return (
    <div className="flex items-center gap-2">
      {previous ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/shows/${showId}/seasons/${previous.seasonNumber}` as Route}>Previous</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}
      {next ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/shows/${showId}/seasons/${next.seasonNumber}` as Route}>Next</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </div>
  );
}
