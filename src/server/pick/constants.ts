// Named, documented weights for Pick's deterministic scoring — see
// docs/recommendations.md, "Scoring model". Every number the engine uses
// lives here, not inline in scoring.ts/candidates-discovery.ts, so the
// whole model stays visible and tunable in one place. None of these are
// tuned to "look good" on a demo account — each maps to a specific
// documented reason at its point of use, same discipline as
// `server/stats/constants.ts`.

// --- Bounded candidate pool sizes (never unbounded) ----------------------

// How many saved (Watchlist + Backlog) items are considered as
// candidates, most recently changed first — bounds provider hydration
// regardless of how large a user's Library gets.
export const PICK_SAVED_CANDIDATE_LIMIT = 20;
// Raw items pulled from a single discovery source (one recommendations
// seed, one genre discover page) before merging/deduping across sources.
export const PICK_DISCOVERY_PER_SOURCE_LIMIT = 8;
// The final, deduplicated, exclusion-filtered discovery set that actually
// gets fully hydrated (details fetch) — the expensive step, so this is
// the one true ceiling on discovery cost per Pick request.
export const PICK_DISCOVERY_RAW_CANDIDATE_LIMIT = 12;

// --- Taste summary bounds (mirrors server/stats/constants.ts) -----------

export const PICK_TASTE_HYDRATION_LIMIT = 60;
// Credits (director) are only fetched for a smaller, most-recently-active
// subset of the hydrated titles above — same reasoning as Stats' own
// TASTE_CREDITS_HYDRATION_LIMIT.
export const PICK_TASTE_CREDITS_LIMIT = 20;
export const PICK_TASTE_GENRE_LIMIT = 3;
export const PICK_TASTE_SEED_MOVIE_LIMIT = 3;
export const PICK_TASTE_SEED_SHOW_LIMIT = 2;
// The user needs at least this many total distinct watched titles before
// Pick attempts any personalization at all — mirrors Stats' own
// MIN_TOTAL_TITLES_FOR_GENRE_INSIGHT reasoning: a couple of watches isn't
// evidence of a real taste yet (see docs/recommendations.md).
export const PICK_TASTE_MIN_TITLES_FOR_PERSONALIZATION = 3;

// --- Time presets ----------------------------------------------------------
//
// Named, human-friendly presets — never a raw minute slider (see
// docs/recommendations.md, "Time presets"). Thresholds reflect real
// runtime shapes: a single TV episode (~35 min covers the vast majority
// of half-hour and most hour-long dramas' actual runtime once you allow
// some slack), a single movie or a couple of episodes (~65 min), and a
// full feature film including longer runtimes (~150 min, covers the
// large majority of theatrical releases).
export const TIME_BUDGET_QUICK_MINUTES = 35;
export const TIME_BUDGET_HOUR_MINUTES = 65;
export const TIME_BUDGET_MOVIE_NIGHT_MINUTES = 150;

// --- Base scores by candidate kind ----------------------------------------
//
// Continuity and stronger saved intent always outrank a fresh discovery
// pick at the base-score level — matching the phase's core principle
// (prefer existing intent over new discovery unless discovery is clearly
// better) — before any modifier below is even considered.
export const CONTINUE_BASE_SCORE = 100;
export const FINISH_SOON_BONUS = 20;
export const BACKLOG_BASE_SCORE = 55;
export const WATCHLIST_BASE_SCORE = 35;
export const DISCOVERY_BASE_SCORE = 15;

// --- Modifiers, applied on top of a base score ---------------------------

// Per matching high-affinity genre, capped at two genres' worth so one
// title covering five overlapping genres doesn't dominate on genre count
// alone.
export const GENRE_AFFINITY_BONUS = 8;
export const GENRE_AFFINITY_MAX_BONUS = GENRE_AFFINITY_BONUS * 2;
export const DIRECTOR_AFFINITY_BONUS = 12;
export const RECOMMENDATION_SOURCE_BONUS = 4;
export const TIME_FIT_BONUS = 6;
// A continuation earns this only when the show's last watch activity was
// genuinely recent — see scoring.ts, `recentContinuation`. Deliberately
// small: recency is a gentle tie-breaker, never enough on its own to beat
// Finish Soon or a real time-fit match.
export const RECENT_CONTINUATION_BONUS = 5;
export const RECENT_CONTINUATION_MAX_DAYS = 2;

// --- Selection / diversity -------------------------------------------------

export const PICK_ALTERNATIVE_COUNT = 2;
// An alternative of a differing `kind` than what's already chosen is only
// preferred over the next-best-scoring candidate when it scores within
// this fraction of the best remaining score — see
// docs/recommendations.md, "Diversity pass".
export const DIVERSITY_SCORE_BAND = 0.85;
// How far into the remaining ranked list the diversity pass looks for a
// differing-kind candidate before giving up and taking the next-best
// regardless of kind.
export const DIVERSITY_LOOKAHEAD = 4;

// --- Controlled variety (primary pick rotation) ----------------------------
//
// Pure determinism (the same #1 candidate forever) reads as stale; pure
// randomness would let a meaningfully weaker candidate occasionally win,
// destroying trust in "why this?" (see docs/recommendations.md,
// "Controlled variety"). Rotation is only ever considered among the
// leading candidates within this fraction of the top score — tighter
// than the alternatives' diversity band, since this decides the primary
// pick itself, not a secondary slot.
export const PRIMARY_VARIETY_SCORE_BAND = 0.95;
// Even if more than this many candidates are within the band, rotation
// only ever considers the top few — never the whole near-tied pool.
export const PRIMARY_VARIETY_POOL_SIZE = 3;
