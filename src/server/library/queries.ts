import "server-only";
import { requireSession } from "@/server/auth/session";
import { LIBRARY_PAGE_SIZE } from "@/server/library/constants";
import type { MediaType } from "@/server/media/types";
import type { LibraryRawState, LibrarySort } from "./candidates";
import { listLibraryCandidates } from "./candidates";
import { composeLibraryItems } from "./compose";
import { searchLibrary } from "./search";
import type { LibraryItem } from "./types";

export type LibraryPage = {
  items: readonly LibraryItem[];
  hasMore: boolean;
  // Only ever `true` on a search result page (see `getLibraryPage`'s
  // `query` param and docs/library.md, "Search") — always `false`
  // otherwise, never meaningful outside a search.
  scanWasCapped: boolean;
};

// The Library's one reusable read — a page of the current user's personal
// media, composed with provider metadata. This is the "personal media
// query layer" future Home personalization should call (e.g. `state:
// "watching", sort: "recently_active", count: 6` for an eventual
// "Continue Watching" section) instead of duplicating raw DB access — see
// docs/library.md, "Future Home reuse boundary". Not a Home-specific
// rendering model — this returns the same `LibraryItem` shape regardless
// of caller.
//
// `count` (not offset) grows via the Library page's "Load more" link, so
// pagination stays a plain, bookmarkable/back-forward-safe URL value
// rather than client state, and each request is still one bounded SQL
// query, never the user's entire history.
export async function getLibraryPage(input: {
  mediaType?: MediaType | undefined;
  state?: LibraryRawState | undefined;
  sort: LibrarySort;
  count?: number | undefined;
  // A non-empty value switches this into a Library-search read — see
  // `searchLibrary`/docs/library.md, "Search". `sort` is ignored in that
  // case (search results are relevance-ranked, not recency/added-ranked).
  query?: string | undefined;
}): Promise<LibraryPage> {
  const { user } = await requireSession();
  const limit = input.count ?? LIBRARY_PAGE_SIZE;

  if (input.query) {
    const { items, hasMore, scanWasCapped } = await searchLibrary({
      userId: user.id,
      query: input.query,
      mediaType: input.mediaType,
      state: input.state,
      count: limit,
    });
    return { items, hasMore, scanWasCapped };
  }

  const { candidates, hasMore } = await listLibraryCandidates({
    userId: user.id,
    mediaType: input.mediaType,
    state: input.state,
    sort: input.sort,
    limit,
    offset: 0,
  });

  const items = await composeLibraryItems(user.id, candidates);
  return { items, hasMore, scanWasCapped: false };
}
