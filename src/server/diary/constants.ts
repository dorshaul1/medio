// A plain constant, deliberately in its own file with no `server-only`
// import — same reasoning as `server/library/constants.ts`: both
// `server/diary/events.ts` (server-only) and `features/diary/`'s URL
// param parsing need it, and the latter must not pull in a server-only
// module transitively just to read one number.
export const DIARY_PAGE_SIZE = 20;

// Session grouping's one named threshold (see
// `features/diary/diary-session-grouping.ts` and docs/diary.md, "Viewing
// session grouping"): two consecutive same-show Episode entries on the
// same calendar day are presented as one binge session only when the gap
// between them is within this many minutes. Chosen conservatively —
// generous enough to cover a normal binge sitting (episodes are commonly
// 20-70 minutes; a few minutes to over an hour between episodes for
// bathroom/snack/chat breaks is completely normal), but tight enough that
// two unrelated same-day sittings (e.g. one episode at breakfast, another
// after work) never get merged into a false "session". Presentation-only
// — never changes what's stored or how progress/history is computed.
export const DIARY_SESSION_MAX_GAP_MINUTES = 180;
