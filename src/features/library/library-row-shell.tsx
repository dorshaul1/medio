import Image from "next/image";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import type { mediaHref } from "@/features/media/media-route";
import { showViewingStateLabel } from "@/features/shows/show-viewing-state-label";
import type { LibraryItem } from "@/server/library/types";

// The row shell/identity/detail pieces `LibraryItemRow` (Server
// Component) and `TrackedShowLibraryRow` (Client Component, since it
// needs `useMarkNextEpisodeWatched`'s hook — see
// tracked-show-library-row.tsx) both compose. Kept in their own
// dependency-free module rather than exported from either of those two
// files specifically to avoid a circular import between them.

export function LibraryRowShell({ children }: { children: React.ReactNode }) {
  return (
    // Density (see docs/settings.md, "Content density") uses the
    // `data-density` attribute AppShell sets, not a prop threaded down
    // from the page — Compact tightens row padding and shrinks the
    // poster slightly rather than a blanket padding change everywhere.
    <li className="flex items-center gap-3 py-2.5 [[data-density=compact]_&]:py-1.5">{children}</li>
  );
}

export function LibraryRowIdentity({
  href,
  poster,
  mediaType,
  title,
  children,
}: {
  href: ReturnType<typeof mediaHref>;
  poster: string | null;
  mediaType: "movie" | "show";
  title: string;
  children: React.ReactNode;
}) {
  return (
    // One link for the whole poster+title identity — not two separate
    // links to the same destination. The title text supplies the
    // accessible name (poster alt="" is deliberate, same reasoning as
    // MediaPoster); a poster-only link with no text would have none.
    <Link
      href={href}
      draggable={false}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-14 [[data-density=compact]_&]:w-10 [[data-density=compact]_&]:sm:w-11">
        {poster ? (
          // Links and images are natively draggable in every browser by
          // default (HTML5 drag-and-drop) — inside a swipeable row (see
          // `EpisodeSwipeRow`) that hijacks a mouse-based drag before it
          // ever reaches this app's own pointer handlers, since native
          // drag-and-drop and pointer events are two separate browser
          // mechanisms. `draggable={false}` here and on the `Link` above
          // is what makes the gesture actually work with a mouse, not
          // just real touch.
          <Image src={poster} alt="" fill sizes="56px" draggable={false} className="object-cover" />
        ) : (
          <MediaPosterFallback mediaType={mediaType} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{title}</p>
        {children}
      </div>
    </Link>
  );
}

// Keyed by next-episode identity at the tracked-show call site (see
// `TrackedShowLibraryRow`) so its own small entrance animation
// (`library-detail-advance` in globals.css) plays exactly when the next
// episode actually changes, the same "remount on identity change" trick
// Up Next's card itself uses — never on an unrelated re-render.
export function LibraryItemDetail({ item }: { item: LibraryItem }) {
  switch (item.kind) {
    case "planned-movie":
    case "planned-show":
      return (
        <p className="text-xs text-muted-foreground">
          {item.year ? `${item.year} · ` : ""}
          {item.intent === "watchlist" ? "Watchlist" : "Backlog"}
        </p>
      );
    case "watched-movie":
      return (
        <p className="text-xs text-muted-foreground">
          {item.year ? `${item.year} · ` : ""}
          {item.watchCount > 1 ? `Watched ${item.watchCount}×` : "Watched"}
        </p>
      );
    case "tracked-show": {
      const label = showViewingStateLabel(item.explicitState, item.derivedState);
      const ratio =
        item.airedEpisodeCount > 0 ? (item.watchedEpisodeCount / item.airedEpisodeCount) * 100 : 0;
      const nextEpisodeText = item.nextEpisode
        ? `S${item.nextEpisode.seasonNumber} E${item.nextEpisode.episodeNumber} next`
        : null;
      // "S2 E4 next" alone while actively watching (the label would just
      // repeat what the quick action already implies); "On hold ·
      // S3 E2 next" keeps the state word once paused, since that's the
      // more important fact there — see docs/library.md, "Progress
      // format".
      const primaryText =
        item.derivedState === "watching" && nextEpisodeText
          ? nextEpisodeText
          : nextEpisodeText
            ? `${label} · ${nextEpisodeText}`
            : label;

      return (
        <div className="flex flex-wrap items-center gap-2 animate-[library-detail-advance_260ms_ease-out]">
          <span className="text-xs text-muted-foreground">{primaryText}</span>
          {item.airedEpisodeCount > 0 ? (
            <>
              <Progress value={ratio} className="w-16" />
              <span className="text-xs text-muted-foreground">
                {item.watchedEpisodeCount} / {item.airedEpisodeCount} aired
              </span>
            </>
          ) : null}
        </div>
      );
    }
  }
}
