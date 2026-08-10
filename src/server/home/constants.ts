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
