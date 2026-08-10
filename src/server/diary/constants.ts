// A plain constant, deliberately in its own file with no `server-only`
// import — same reasoning as `server/library/constants.ts`: both
// `server/diary/events.ts` (server-only) and `features/diary/`'s URL
// param parsing need it, and the latter must not pull in a server-only
// module transitively just to read one number.
export const DIARY_PAGE_SIZE = 20;
