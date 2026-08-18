import { LibraryItemActions } from "@/features/library/library-item-actions";
import {
  LibraryItemDetail,
  LibraryRowIdentity,
  LibraryRowShell,
} from "@/features/library/library-row-shell";
import { LibraryMovieQuickAction } from "@/features/library/library-movie-quick-action";
import { mediaHref } from "@/features/media/media-route";
import type { MobileEpisodeControlsValue } from "@/server/db/schema/preferences";
import type { LibraryItem } from "@/server/library/types";
import { posterUrl } from "@/server/tmdb/images";
import { TrackedShowLibraryRow } from "./tracked-show-library-row";

// One shared row shell (poster, title/link, trailing actions) with
// kind-specific personal-context content in the middle — a discriminated
// switch, not one prop-monster card with a flag per possible state (see
// docs/library.md, "Avoid one giant item component"). A row, not a
// poster-grid tile: personal state needs room a small tile can't give it,
// and a mixed mostly-recency-sorted list reads better as one consistent
// row shape than switching layouts mid-scroll.
//
// The quick action (when one applies) sits at the row's trailing edge,
// the same position an episode row's watch control occupies
// (features/shows/episode-row.tsx) — it's the same "mark watched"
// concept, so it earns the same place, not a separate line competing
// with the poster/title for attention (see docs/library.md, "Quick
// tracking"). It renders before the overflow menu: the likely next
// action first, the catch-all secondary menu last.
//
// `mobileEpisodeControls` only ever changes an actively-watching tracked
// show's row — see docs/library.md, "Mobile episode controls".
// `TrackedShowLibraryRow` (a separate Client Component — it needs
// `useMarkNextEpisodeWatched`'s hook, which this Server Component can't
// call itself) owns that one case; this stays the plain, server-rendered
// shell for every other kind. Both compose the shared shell pieces from
// `library-row-shell.tsx`, not each other — a Server Component importing
// a Client Component that imports back from it would be a circular
// module dependency.
export function LibraryItemRow({
  item,
  mobileEpisodeControls = "swipe",
  hasSeenSwipeHint = true,
}: {
  item: LibraryItem;
  mobileEpisodeControls?: MobileEpisodeControlsValue;
  // Defaults `true` (never play the hint) rather than `false` — an
  // explicit opt-in, not an accidental opt-in, for any caller that
  // doesn't pass a real preference value (tests, other call sites).
  hasSeenSwipeHint?: boolean;
}) {
  if (item.kind === "tracked-show") {
    return (
      <TrackedShowLibraryRow
        item={item}
        mobileEpisodeControls={mobileEpisodeControls}
        hasSeenSwipeHint={hasSeenSwipeHint}
      />
    );
  }

  const href = mediaHref({ mediaType: item.mediaType, id: item.mediaProviderId });
  const poster = posterUrl(item.poster, "small");
  const quickAction =
    item.kind === "planned-movie" ? <LibraryMovieQuickAction item={item} /> : null;

  return (
    <LibraryRowShell>
      <LibraryRowIdentity href={href} poster={poster} mediaType={item.mediaType} title={item.title}>
        <LibraryItemDetail item={item} />
      </LibraryRowIdentity>
      {quickAction}
      <LibraryItemActions item={item} />
    </LibraryRowShell>
  );
}
