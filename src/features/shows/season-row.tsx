import { MediaRowScroller } from "@/features/media/media-row-scroller";
import { SeasonTile } from "@/features/shows/season-tile";
import { sortSeasons } from "@/features/shows/sort-seasons";
import type { SeasonSummary } from "@/server/media/types";

// Seasons are Show Details' primary product surface, not secondary
// metadata (see docs/architecture.md) — sized as the page's lead row
// (the same "large" tile width Home gives its own lead section) and
// placed ahead of Cast/related content on the page. A horizontal
// scroller, not tabs: the same composition works whether a show has 1
// season or 30, so it never turns into a tab-overflow problem.
export function SeasonRow({
  showId,
  seasons,
}: {
  showId: number;
  seasons: readonly SeasonSummary[];
}) {
  const sorted = sortSeasons(seasons);
  if (sorted.length === 0) return null;

  return (
    <section aria-labelledby="show-seasons" className="flex flex-col gap-3">
      <h2 id="show-seasons" className="text-lg font-medium tracking-tight">
        Seasons
      </h2>
      <MediaRowScroller>
        {sorted.map((season) => (
          <div key={season.id} className="w-36 shrink-0 sm:w-44 lg:w-52">
            <SeasonTile showId={showId} season={season} />
          </div>
        ))}
      </MediaRowScroller>
    </section>
  );
}
