"use client";

import { useEffect, useRef, useState } from "react";
import { EpisodeSwipeRow } from "@/features/library/episode-swipe-row";
import { LibraryItemActions } from "@/features/library/library-item-actions";
import {
  LibraryItemDetail,
  LibraryRowIdentity,
  LibraryRowShell,
} from "@/features/library/library-row-shell";
import { LibraryShowQuickAction } from "@/features/library/library-show-quick-action";
import { useClaimSwipeHint } from "@/features/library/swipe-hint-context";
import { useMarkNextEpisodeWatched } from "@/features/library/use-mark-next-episode-watched";
import { mediaHref } from "@/features/media/media-route";
import type { MobileEpisodeControlsValue } from "@/server/db/schema/preferences";
import type { TrackedShowLibraryItem } from "@/server/library/types";
import { posterUrl } from "@/server/tmdb/images";
import { updatePreferencesAction } from "@/features/settings/settings-actions";

// The one Library item kind whose quick action can be a mobile swipe
// gesture (see docs/library.md, "Mobile episode controls") — a separate
// Client Component from `library-item-row.tsx` specifically because it's
// the only row that needs `useMarkNextEpisodeWatched`'s hook; every
// other item kind stays server-rendered. Always calls the exact same
// mutation `LibraryShowQuickAction`'s own button calls — `EpisodeSwipeRow`
// is a purely presentational/gesture layer on top of it, never a
// parallel tracking implementation.
export function TrackedShowLibraryRow({
  item,
  mobileEpisodeControls,
  hasSeenSwipeHint,
}: {
  item: TrackedShowLibraryItem;
  mobileEpisodeControls: MobileEpisodeControlsValue;
  hasSeenSwipeHint: boolean;
}) {
  const { commit, isPending, nextEpisode } = useMarkNextEpisodeWatched(item);
  const href = mediaHref({ mediaType: "show", id: item.mediaProviderId });
  const poster = posterUrl(item.poster, "small");

  // Swipe only applies to the one state that actually has something to
  // commit — every other tracked-show state (on hold, caught up,
  // waiting, completed, dropped) falls through to the plain row, same
  // as `LibraryShowQuickAction` already renders nothing for them.
  const swipeEnabled =
    item.derivedState === "watching" &&
    Boolean(nextEpisode) &&
    mobileEpisodeControls !== "checkbox";

  const claimHint = useClaimSwipeHint();
  const [playHint, setPlayHint] = useState(false);
  const hintDecidedRef = useRef(false);
  useEffect(() => {
    if (hintDecidedRef.current) return;
    hintDecidedRef.current = true;
    if (!swipeEnabled || hasSeenSwipeHint) return;
    // At most one row per page load ever claims this — see
    // swipe-hint-context.tsx.
    if (!claimHint()) return;
    setPlayHint(true);
    updatePreferencesAction({ hasSeenSwipeHint: true }).catch(() => {
      // A failed write here just means the hint might play again on a
      // future visit — never worth surfacing as an error to the user.
    });
  }, [swipeEnabled, hasSeenSwipeHint, claimHint]);

  const identity = (
    <LibraryRowIdentity href={href} poster={poster} mediaType="show" title={item.title}>
      {/* Keyed by next-episode identity, not `item` as a whole — this is
          what makes `library-detail-advance` replay exactly when the
          next episode actually changes (a real remount), the same
          "remount on identity change" trick Up Next's own card uses,
          never on an unrelated re-render. */}
      <LibraryItemDetail key={item.nextEpisode?.episodeProviderId ?? "none"} item={item} />
    </LibraryRowIdentity>
  );

  return (
    <LibraryRowShell>
      {swipeEnabled ? (
        <EpisodeSwipeRow onCommit={commit} disabled={isPending} playHintOnMount={playHint}>
          {identity}
        </EpisodeSwipeRow>
      ) : (
        identity
      )}
      {/* A dedicated hiding wrapper, not a `className` passed into
          `LibraryShowQuickAction` itself — `sr-only` and `IconButton`'s
          own `size-*` utility both touch width/height, and Tailwind
          gives no guarantee which one wins when merged onto the same
          element (they're different conflict groups, so `tailwind-merge`
          keeps both and CSS output order decides — not reliable). A
          plain wrapper with nothing else on it hides unambiguously: its
          own clip/position always applies to the whole subtree
          regardless of the button's internal sizing. */}
      <span className={mobileEpisodeControls === "swipe" ? "sr-only md:not-sr-only" : "contents"}>
        <LibraryShowQuickAction item={item} />
      </span>
      <LibraryItemActions item={item} />
    </LibraryRowShell>
  );
}
