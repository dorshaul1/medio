// A single accidental keystroke shouldn't fire a request to three TMDB
// endpoints at once — this is the line between "still typing" and
// "worth searching for". The one canonical definition; both the compact
// suggestion overlay (features/search/) and the full `/discover?q=`
// results page (features/discover/) read this rather than each guessing
// their own threshold.
export const SEARCH_MIN_QUERY_LENGTH = 2;

// Unified Search returns ONE cross-type ranked list, not per-type quotas
// (see docs/search.md, "Unified search ranking") — these bound
// how many *candidates per type* get fetched/ranked before slicing to the
// limits below, generous enough that a genuinely relevant result rarely
// gets excluded from ranking just because it wasn't in a type's first
// handful of provider results.
export const SEARCH_CANDIDATES_PER_TYPE = 20;

// The compact "search-as-you-type" overlay — top results across all
// three types, unbounded by type. Small enough to stay a fast preview,
// never a second full results page rendered in a popover.
export const SEARCH_SUGGESTION_LIMIT = 8;

// The full results page shows more, still bounded — see "Large Search
// Results" in the product spec. `INITIAL` is what renders before "Show
// more"; `MAX` is the ceiling "Show more" reveals, both slices of the
// same already-ranked, already-fetched candidate set (no second
// request).
export const SEARCH_RESULTS_INITIAL_LIMIT = 15;
export const SEARCH_RESULTS_MAX_LIMIT = 40;

// The optional type filter on the full results page — "All" is always
// the default; see docs/media-provider.md.
export const SEARCH_RESULT_TYPES = ["all", "movies", "shows", "people"] as const;
export type SearchResultTypeFilter = (typeof SEARCH_RESULT_TYPES)[number];
