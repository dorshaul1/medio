// A plain constant, deliberately in its own file with no `server-only`
// import: both `server/library/queries.ts` (server-only) and
// `features/library/library-params.ts` (parses/clamps the `?count=`
// URL param, and is imported by ordinary page/component code) need it,
// and a params helper must not pull in a server-only module transitively
// just to read one number.
export const LIBRARY_PAGE_SIZE = 24;

// Library search never hydrates a user's entire personal history — see
// docs/library.md, "Search". This bounds how many of the user's most-
// recently-active candidates get title hydration to check against a
// search query, the same "bounded by recency, not exhaustive" tradeoff
// `server/stats/` already documents for its own provider hydration. A
// title outside this window (a very old, long-untouched save in a huge
// Library) won't surface in search — an accepted, honestly-documented
// scale limit, not a silent correctness bug.
export const LIBRARY_SEARCH_CANDIDATE_CAP = 400;
