import Image from "next/image";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { LibraryItemActions } from "@/features/library/library-item-actions";
import { LibraryMovieQuickAction } from "@/features/library/library-movie-quick-action";
import { LibraryShowQuickAction } from "@/features/library/library-show-quick-action";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { mediaHref } from "@/features/media/media-route";
import { showViewingStateLabel } from "@/features/shows/show-viewing-state-label";
import type { LibraryItem } from "@/server/library/types";
import { posterUrl } from "@/server/tmdb/images";

// One shared row shell (poster, title/link, trailing actions) with
// kind-specific personal-context content in the middle — a discriminated
// switch, not one prop-monster card with a flag per possible state (see
// docs/library.md, "Avoid one giant item component"). A row, not a
// poster-grid tile: personal state needs room a small tile can't give it,
// and a mixed mostly-recency-sorted list reads better as one consistent
// row shape than switching layouts mid-scroll.
//
// The quick action (when one applies — see `libraryQuickAction`) sits at
// the row's trailing edge, the same position an episode row's watch
// control occupies (features/shows/episode-row.tsx) — it's the same
// "mark watched" concept, so it earns the same place, not a separate
// line competing with the poster/title for attention (see
// docs/library.md, "Quick tracking"). It renders before the overflow
// menu: the likely next action first, the catch-all secondary menu last.
// `LibraryItemDetail` is keyed by the show's next-episode identity so its
// own small entrance animation (`library-detail-advance` in globals.css)
// plays exactly when the next episode actually changes, the same
// "remount on identity change" trick Up Next's card itself uses — never
// on an unrelated re-render.
export function LibraryItemRow({ item }: { item: LibraryItem }) {
  const href = mediaHref({ mediaType: item.mediaType, id: item.mediaProviderId });
  const poster = posterUrl(item.poster, "small");
  const quickAction = libraryQuickAction(item);

  return (
    // Density (see docs/settings.md, "Content density") uses the
    // `data-density` attribute AppShell sets, not a prop threaded down
    // from the page — Compact tightens row padding and shrinks the
    // poster slightly rather than a blanket padding change everywhere.
    <li className="flex items-center gap-3 py-2.5 [[data-density=compact]_&]:py-1.5">
      {/* One link for the whole poster+title identity — not two
          separate links to the same destination. The title text
          supplies the accessible name (poster alt="" is deliberate,
          same reasoning as MediaPoster); a poster-only link with no
          text would have none. */}
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-14 [[data-density=compact]_&]:w-10 [[data-density=compact]_&]:sm:w-11">
          {poster ? (
            <Image src={poster} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <MediaPosterFallback mediaType={item.mediaType} />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
          <LibraryItemDetail key={libraryItemDetailKey(item)} item={item} />
        </div>
      </Link>

      {quickAction}
      <LibraryItemActions item={item} />
    </li>
  );
}

// Only the tracked-show case ever needs to remount on its own (see the
// component comment) — every other kind gets a stable per-kind key, so
// it never remounts on an unrelated re-render either.
function libraryItemDetailKey(item: LibraryItem): string {
  if (item.kind === "tracked-show") {
    return `tracked-show-${item.nextEpisode?.episodeProviderId ?? "none"}`;
  }
  return item.kind;
}

function libraryQuickAction(item: LibraryItem) {
  if (item.kind === "tracked-show") return <LibraryShowQuickAction item={item} />;
  if (item.kind === "planned-movie") return <LibraryMovieQuickAction item={item} />;
  return null;
}

function LibraryItemDetail({ item }: { item: LibraryItem }) {
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
