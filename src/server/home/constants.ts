// How many of the user's most-recently-active "watching" shows get
// (comparatively expensive) provider hydration for personalized Home —
// see docs/home.md, "Candidate-first strategy". Deliberately small: Home
// shows at most a handful of active titles, not a deep browse (that's
// Library's job).
export const HOME_ACTIVE_SHOW_CANDIDATE_LIMIT = 8;

// A show qualifies for "Finish Soon" once at most this many aired regular
// episodes remain unwatched (and at least one does — see docs/home.md,
// "Finish Soon"). A small, named, documented constant — not a magic
// number buried in a component.
export const FINISH_SOON_MAX_REMAINING_EPISODES = 3;

// Calendar layout's "Later" bucket stays a bounded preview, never
// Calendar's own full 90-day horizon — see docs/home.md, "Calendar
// layout".
export const HOME_CALENDAR_LATER_LIMIT = 6;

// Balanced's much smaller "a restrained amount of discovery/releases"
// teaser — see docs/home.md, "Balanced layout".
export const HOME_CALENDAR_PREVIEW_LIMIT = 3;

// Personal layout's Backlog row — same candidate-first shape as
// everything else in `server/home/`: a cheap, bounded local read first
// (`HOME_BACKLOG_CANDIDATE_LIMIT`, mirroring Calendar's own
// `CALENDAR_PLANNED_CANDIDATE_LIMIT`), then provider hydration bounded to
// a much smaller number actually worth rendering in one row.
export const HOME_BACKLOG_CANDIDATE_LIMIT = 30;
export const HOME_BACKLOG_ROW_LIMIT = 10;
