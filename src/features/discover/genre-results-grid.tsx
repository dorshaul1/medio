import { MediaPoster } from "@/features/media/media-poster";
import type { MediaPersonalState, MediaSummary } from "@/server/media/types";

// A responsive poster grid — the one place in the product that uses one
// (see docs/architecture.md): a dedicated genre page is explicit
// catalog-browsing, unlike Home/Discover's editorial rows. auto-fill +
// minmax sizes columns from a deliberate poster width rather than fixed
// breakpoint column counts, so it never mechanically crams in more tiny
// columns just because the viewport got wider.
export function GenreResultsGrid({
  items,
  emptyLabel,
  personalStates,
}: {
  items: readonly MediaSummary[];
  emptyLabel: string;
  // Optional — a caller that already batched personal state for this
  // page's visible items (see server/media/personal-state.ts) passes it
  // so each tile gets its quiet Watched/Saved corner mark; omitted,
  // every tile just renders state-unaware (see docs/media-provider.md,
  // "Personal state on public surfaces").
  personalStates?: ReadonlyMap<string, MediaPersonalState>;
}) {
  if (items.length === 0) {
    return <p className="py-10 text-sm text-muted-foreground">No {emptyLabel} found.</p>;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-8">
      {items.map((item) => (
        <MediaPoster
          key={`${item.mediaType}-${item.id}`}
          media={item}
          {...(personalStates
            ? {
                personalState: personalStates.get(`${item.mediaType}:${item.id}`) ?? {
                  kind: "none",
                },
              }
            : {})}
        />
      ))}
    </div>
  );
}
