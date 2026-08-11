import "server-only";
import type { MediaType } from "@/server/media/types";
import { getMovieDetails, getShowDetails } from "@/server/tmdb/queries";
import type { LibraryCandidate, LibraryRawState } from "./candidates";
import { listLibrarySearchCandidates } from "./candidates";
import { composeLibraryItems } from "./compose";
import { LIBRARY_SEARCH_CANDIDATE_CAP } from "./constants";
import type { LibraryItem } from "./types";

// Library search — see docs/library.md, "Search". Title lives in TMDB,
// never in Postgres (see candidates.ts's module comment), so a text query
// can only be checked after hydrating candidates' titles. This never
// issues a TMDB request per keystroke: the caller (the Library page)
// debounces the URL's `?q=` before this runs at all, and this itself is
// one bounded batch, not a fetch loop tied to typing.

type TitledCandidate = { candidate: LibraryCandidate; title: string; originalTitle: string };

// Swallows a single title's hydration failure (a live TMDB error, or a
// title that's since become unavailable) rather than failing the whole
// search — the same "one bad title never breaks the page" rule
// `compose.ts` already follows.
async function hydrateTitle(candidate: LibraryCandidate): Promise<TitledCandidate | null> {
  try {
    if (candidate.mediaType === "movie") {
      const movie = await getMovieDetails(candidate.mediaProviderId);
      return { candidate, title: movie.title, originalTitle: movie.originalTitle };
    }
    const show = await getShowDetails(candidate.mediaProviderId);
    return { candidate, title: show.title, originalTitle: show.originalTitle };
  } catch {
    return null;
  }
}

function matchesQuery(entry: TitledCandidate, normalizedQuery: string): boolean {
  return (
    entry.title.toLowerCase().includes(normalizedQuery) ||
    entry.originalTitle.toLowerCase().includes(normalizedQuery)
  );
}

export type LibrarySearchPage = {
  items: readonly LibraryItem[];
  hasMore: boolean;
  // True once the underlying candidate scan hit its bounded cap (see
  // `LIBRARY_SEARCH_CANDIDATE_CAP`) — lets the UI honestly note results
  // may not cover a very old, long-untouched save in a huge Library,
  // rather than silently implying it searched everything.
  scanWasCapped: boolean;
};

// One bounded, relevance-ranked page of the user's own Library matching
// `query` — never the global TMDB catalog (see docs/library.md,
// "Library search vs. global search"). `mediaType`/`state` apply as the
// same pre-filters the normal candidate query uses, so search composes
// with Library's other filters instead of replacing them.
export async function searchLibrary(input: {
  userId: string;
  query: string;
  mediaType?: MediaType | undefined;
  state?: LibraryRawState | undefined;
  count: number;
}): Promise<LibrarySearchPage> {
  const normalizedQuery = input.query.trim().toLowerCase();

  const candidates = await listLibrarySearchCandidates({
    userId: input.userId,
    mediaType: input.mediaType,
    state: input.state,
  });
  const scanWasCapped = candidates.length >= LIBRARY_SEARCH_CANDIDATE_CAP;

  // Parallel, bounded to the search cap — never per-keystroke, never
  // unbounded (see the cap's own comment in constants.ts).
  const hydrated = await Promise.all(candidates.map(hydrateTitle));
  const titled = hydrated.filter((entry): entry is TitledCandidate => entry !== null);
  const matched = titled.filter((entry) => matchesQuery(entry, normalizedQuery));

  // Relevance: a title that *starts with* the query ranks above one that
  // merely contains it — both groups keep the scan's own recency order
  // (newest-activity-first) rather than introducing a second, competing
  // sort the user never chose.
  const startsWith: LibraryCandidate[] = [];
  const contains: LibraryCandidate[] = [];
  for (const entry of matched) {
    const bucket = entry.title.toLowerCase().startsWith(normalizedQuery) ? startsWith : contains;
    bucket.push(entry.candidate);
  }
  const ranked = [...startsWith, ...contains];

  const hasMore = ranked.length > input.count;
  const page = ranked.slice(0, input.count);
  const items = await composeLibraryItems(input.userId, page);

  return { items, hasMore, scanWasCapped };
}
