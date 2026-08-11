import type { ReactNode } from "react";
import { MediaPoster } from "@/features/media/media-poster";
import { MediaRowScroller } from "@/features/media/media-row-scroller";
import { cn } from "@/lib/utils";
import type { MediaPersonalState, MediaSummary } from "@/server/media/types";

const TILE_WIDTH = {
  // The default for most rows.
  default: "w-28 sm:w-36 lg:w-44",
  // For the one or two rows on a page that should read as the lead —
  // e.g. Home's first section — creating rhythm through scale rather
  // than every row being visually identical.
  large: "w-36 sm:w-44 lg:w-52",
} as const;

// A horizontally browsable group of posters — Discover's/Home's primary
// browsing unit. Stays a Server Component: the poster tiles below render
// here, and only the optional desktop scroll-button chrome
// (MediaRowScroller) is a client boundary. Native scroll remains the real
// interaction on every input; no carousel library, no drag handling.
export function MediaCollectionRow({
  id,
  title,
  items,
  action,
  size = "default",
  priority = false,
  watchedMovieIds,
  personalStates,
}: {
  // Caller-supplied rather than derived, so the heading/section pairing
  // stays a plain id/aria-labelledby without a client-only id hook.
  id: string;
  title: string;
  items: readonly MediaSummary[];
  // A restrained secondary affordance next to the heading — e.g. Discover's
  // genre rows' "View all". Deliberately not styled to compete with the
  // heading; the caller supplies real link/button semantics.
  action?: ReactNode;
  size?: "default" | "large";
  priority?: boolean;
  // Optional, movie-watched-only — only a caller that already batched a
  // private watched-state lookup for exactly these items passes this
  // (see `server/tracking/movie-events.ts`'s `getWatchedMovieIds`).
  // Ignored when `personalStates` is also passed — see that prop below.
  watchedMovieIds?: ReadonlySet<number>;
  // The fuller batched personal-state signal (see
  // server/media/personal-state.ts), covering both media types and every
  // state, not just "watched movie" — a caller that already has this
  // (Discover's genre rows) passes it instead of `watchedMovieIds`.
  // Optional/additive: every other caller keeps rendering plain, state-
  // unaware posters, same as before.
  personalStates?: ReadonlyMap<string, MediaPersonalState>;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="text-lg font-medium tracking-tight">
          {title}
        </h2>
        {action}
      </div>

      {/* Negative margin + matching padding (applied inside
          MediaRowScroller) bleeds the scroll area to the viewport edge
          (so it doesn't feel clipped mid-scroll) while the resting
          position of the first/last poster still lines up with
          PageContainer's own content edge — matching its px-5/8/10 steps. */}
      <MediaRowScroller>
        {items.map((item, index) => (
          <div key={`${item.mediaType}-${item.id}`} className={cn("shrink-0", TILE_WIDTH[size])}>
            <MediaPoster
              media={item}
              priority={priority && index < 6}
              watched={item.mediaType === "movie" && (watchedMovieIds?.has(item.id) ?? false)}
              {...(personalStates
                ? {
                    personalState: personalStates.get(`${item.mediaType}:${item.id}`) ?? {
                      kind: "none",
                    },
                  }
                : {})}
            />
          </div>
        ))}
      </MediaRowScroller>
    </section>
  );
}
