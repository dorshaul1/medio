import type { MediaPersonalState, MediaSummary, PersonSummary } from "@/server/media/types";

// One normalized result union across all three provider search endpoints
// — see docs/search.md, "Unified search ranking". Deliberately
// three distinct variants (not one object with a pile of optional
// fields): a Movie/Show result's personal state and a Person result's
// lack of one are genuinely different shapes, not the same shape with
// unused fields — same discriminated-union discipline `LibraryItem`
// already follows.
export type SearchResult =
  | { kind: "movie"; media: MediaSummary; personalState: MediaPersonalState }
  | { kind: "show"; media: MediaSummary; personalState: MediaPersonalState }
  | { kind: "person"; person: PersonSummary };

// One deterministic, cross-type ranked list (see server/search/rank.ts)
// — never grouped/sliced by type. `hasMore` drives "Show more" without a
// second request (see SEARCH_RESULTS_MAX_LIMIT); `failedTypes` stays
// per-type so a TMDB error searching People never hides Movie/Show
// results that did load.
export type UnifiedSearchResults = {
  results: readonly SearchResult[];
  hasMore: boolean;
  failedTypes: readonly ("movies" | "shows" | "people")[];
};
