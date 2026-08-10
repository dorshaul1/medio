// A plain constant, deliberately in its own file with no `server-only`
// import: both `server/library/queries.ts` (server-only) and
// `features/library/library-params.ts` (parses/clamps the `?count=`
// URL param, and is imported by ordinary page/component code) need it,
// and a params helper must not pull in a server-only module transitively
// just to read one number.
export const LIBRARY_PAGE_SIZE = 24;
