import { Skeleton } from "@/components/ui/skeleton";

// Each size's spacing/typography values are copied from the *specific*
// real tile it stands in for, not guessed — the whole point of a
// skeleton is zero layout shift when real content replaces it, so a bar
// that's the wrong height (relative to the text size it stands in for)
// or a wrapper with the wrong margin is a real, visible "hump," not a
// cosmetic detail. Tailwind's default line-heights: text-xs → 1rem
// (`h-4`), text-sm → 1.25rem (`h-5`) — every bar height below is one of
// those, matched to the exact class the real `<p>` it replaces uses.
const TILE_CONFIG = {
  // `FinishSoonTile` (finish-soon-row.tsx): mt-1.5, gap-0.5, text-xs
  // title, text-[0.6875rem] meta.
  compact: {
    width: "w-24 sm:w-28",
    topMargin: "mt-1.5",
    gap: "gap-0.5",
    titleHeight: "h-4",
    metaHeight: "h-3.5",
  },
  // `ContinueWatchingTile`/`BacklogTile`: mt-2, gap-1, text-sm title,
  // text-xs meta (`ContinueWatchingTile` also has a `Progress` as a
  // third same-gap item — see `extraLine`).
  cozy: {
    width: "w-32 sm:w-40",
    topMargin: "mt-2",
    gap: "gap-1",
    titleHeight: "h-5",
    metaHeight: "h-4",
  },
  // `MediaPoster` (media-poster.tsx), the shape every public collection
  // row (Trending, Popular, ...) actually renders: mt-2, gap-0.5,
  // text-sm title, text-xs meta — "large" is the same shape, just a
  // wider tile (see `MediaCollectionRow`'s own `size` prop).
  default: {
    width: "w-28 sm:w-36 lg:w-44",
    topMargin: "mt-2",
    gap: "gap-0.5",
    titleHeight: "h-5",
    metaHeight: "h-4",
  },
  large: {
    width: "w-36 sm:w-44 lg:w-52",
    topMargin: "mt-2",
    gap: "gap-0.5",
    titleHeight: "h-5",
    metaHeight: "h-4",
  },
} as const;

const TILE_RADIUS = {
  md: "rounded-md",
  lg: "rounded-lg",
} as const;

// The heading text is already known statically (it's the section's real
// title, e.g. "Trending movies") — only the tiles are actually loading, so
// only they get skeletons. Showing the real heading immediately keeps the
// page from feeling like it's still figuring out what it's even showing.
// `radius` matches whichever real tile shape the caller renders once
// loaded — Discover/Home's public collection rows use `MediaPoster`'s
// `rounded-lg`; Home's own personal rows (Finish Soon/Continue Watching/
// Backlog) use a deliberately smaller `rounded-md` (see those
// components) — a skeleton with the wrong radius reads as a visible seam
// the moment real content replaces it. `extraLine` adds a thin bar for
// rows whose real tile has a third line (Continue Watching's progress
// strip) — always the same `gap` as the other two lines, exactly like
// the real `<Progress>` sitting in that tile's one `flex-col gap-*`.
export function MediaCollectionRowSkeleton({
  title,
  size = "default",
  radius = "lg",
  count = 6,
  extraLine = false,
}: {
  title: string;
  size?: keyof typeof TILE_CONFIG;
  radius?: keyof typeof TILE_RADIUS;
  count?: number;
  extraLine?: boolean;
}) {
  const config = TILE_CONFIG[size];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      {/* `pb-2.5`, `overflow-x-auto` sizing, and the -mx/px bleed are
          copied from `MediaRowScroller` exactly — a shorter bottom
          padding here was previously the one difference nudging every
          row's total height by a few pixels the moment real content
          swapped in. */}
      <div className="-mx-5 flex gap-4 overflow-x-hidden px-5 pb-2.5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        {Array.from({ length: count }, (_, index) => (
          // A static-length placeholder list that never reorders — index
          // keys are the documented exception, not real data.
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
          <div key={index} className={`shrink-0 ${config.width}`}>
            <Skeleton className={`aspect-2/3 w-full ${TILE_RADIUS[radius]}`} />
            <div className={`flex flex-col ${config.topMargin} ${config.gap}`}>
              <Skeleton className={`${config.titleHeight} w-3/4 rounded-sm`} />
              <Skeleton className={`${config.metaHeight} w-1/3 rounded-sm`} />
              {extraLine ? <Skeleton className="h-1 w-full rounded-full" /> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
