import { Bookmark, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { mediaHref } from "@/features/media/media-route";
import type { MediaPersonalState, MediaSummary } from "@/server/media/types";
import { posterUrl } from "@/server/tmdb/images";

// The one quiet corner mark this tile ever shows — see the component
// comment on `personalState` below. Paused/inactive states (On hold,
// Dropped) and "none" intentionally get no mark at all: a browse tile is
// not the place to surface those (see docs/library.md's own "inactive
// states shouldn't dominate" reasoning, applied here to public browsing).
function cornerMarkFromState(state: MediaPersonalState | undefined): "watched" | "saved" | null {
  if (!state) return null;
  switch (state.kind) {
    case "watched":
      return "watched";
    case "watchlist":
    case "backlog":
    case "watching":
      return "saved";
    default:
      return null;
  }
}

// The core browse tile: poster, title, year. No server-only import — this
// renders application-owned MediaSummary data a Server Component already
// fetched, so it stays a plain component usable from either boundary.
//
// Sized by MediaCollectionRow (the only current caller) — this component
// fills its parent's width rather than choosing one itself, so it isn't
// locked to a single context.
export function MediaPoster({
  media,
  priority = false,
  watched = false,
  personalState,
}: {
  media: MediaSummary;
  priority?: boolean;
  // A quiet corner mark, not a badge with text — the same filled-circle
  // "watch ring" language as `EpisodeWatchControl` (see docs/tracking.md),
  // so watched means the same thing visually everywhere it appears. Only
  // ever passed by a caller that already batched a private watched-state
  // lookup for its own visible items (see
  // `server/tracking/movie-events.ts`'s `getWatchedMovieIds`) — never
  // computed per-poster. Ignored when `personalState` is also passed.
  watched?: boolean;
  // The fuller batched personal-state signal (see
  // server/media/personal-state.ts) — a caller that already has this
  // (Search/Discover) passes it instead of the plain `watched` boolean,
  // which also picks up a quiet "saved" mark for Watchlist/Backlog/
  // Watching (see `cornerMarkFromState`). Optional/additive: existing
  // callers that only ever computed the simpler watched-only signal keep
  // working unchanged.
  personalState?: MediaPersonalState;
}) {
  const poster = posterUrl(media.poster, "medium");
  const cornerMark = personalState
    ? cornerMarkFromState(personalState)
    : watched
      ? "watched"
      : null;

  return (
    <Link
      href={mediaHref(media)}
      // Only set when watched — the default (undefined) leaves the
      // accessible name to be computed from the title/year text below,
      // same as ever. Explicit here rather than an adjacent sr-only text
      // node: an aria-label gives exact control over the resulting
      // string instead of depending on how child text nodes get joined.
      aria-label={cornerMark === "watched" ? `${media.title}, watched` : undefined}
      // A ring sitting flush against a busy, dark poster edge reads as
      // barely-there (verified by actually tabbing to one — an unbroken
      // ring blends into the artwork's own edge pixels). An offset into
      // the page background turns it into a crisp outline distinct from
      // the artwork, instead of trying to out-contrast the image itself.
      className="group block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-surface-subtle">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 112px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <MediaPosterFallback mediaType={media.mediaType} />
        )}
        {cornerMark ? (
          <div
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm"
          >
            {cornerMark === "watched" ? (
              <Check strokeWidth={2.5} className="size-3" />
            ) : (
              <Bookmark strokeWidth={2.5} className="size-3" fill="currentColor" />
            )}
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        {/* The link's accessible name comes from this text (or the
            watched-state aria-label above) — the poster's alt="" is
            deliberate, not an oversight (see docs comment above posterUrl
            usage / design-system a11y notes: an image alt that just
            repeats adjacent link text is noise for screen readers). */}
        <p className="line-clamp-1 text-sm font-medium text-foreground">{media.title}</p>
        {media.releaseYear ? (
          <p className="text-xs text-muted-foreground transition-colors group-hover:text-foreground/80 group-focus-visible:text-foreground/80">
            {media.releaseYear}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
