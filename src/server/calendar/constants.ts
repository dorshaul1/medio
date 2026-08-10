// Deliberate, documented thresholds for Calendar — see docs/calendar.md.
// Same discipline as `server/stats/constants.ts`/`server/pick/constants.ts`:
// every number here maps to a specific documented reason at its point of
// use, never tuned to "look good" on a demo account.

// A recently-aired, still-unwatched release stays recoverable in the
// "Recently released" bucket for this many days back — long enough to
// survive a normal few-days-away gap, short enough that this never
// becomes a second Up Next/backlog list (see docs/calendar.md, "Calendar
// is not another Up Next").
export const CALENDAR_RECENT_WINDOW_DAYS = 7;

// "This week" covers the day after tomorrow through this many days out
// — a fixed, deterministic window (never tied to a "week starts on"
// preference, since Upcoming is a rolling agenda, not a spatial week
// view — see docs/calendar.md, "This Week").
export const CALENDAR_THIS_WEEK_END_DAYS = 7;

// Upcoming's total forward horizon — bounded so Calendar never requests
// or renders "years of future" data (see docs/calendar.md, "Upcoming
// window").
export const CALENDAR_UPCOMING_HORIZON_DAYS = 90;

// How many currently-"watching" (explicit state) shows are considered as
// Calendar candidates — mirrors `HOME_ACTIVE_SHOW_CANDIDATE_LIMIT`, kept
// as Calendar's own constant since the two surfaces' bound may need to
// diverge later.
export const CALENDAR_ACTIVE_SHOW_CANDIDATE_LIMIT = 30;

// How many saved (Watchlist + Backlog) shows/movies are considered —
// bounds provider hydration regardless of Library size (see
// docs/calendar.md, "Provider request strategy").
export const CALENDAR_PLANNED_CANDIDATE_LIMIT = 30;
