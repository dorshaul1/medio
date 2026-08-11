// Deliberate, documented thresholds for Stats — see docs/stats.md.
// Every number here exists either to keep an insight statistically
// meaningful (real evidence, not a guess from one data point) or to keep
// provider hydration bounded regardless of how much lifetime history a
// user has. None of these are tuned to "look nice" on a demo account —
// each one maps to a specific documented reason at its point of use.

// --- Bounded provider hydration ---------------------------------------

// The most-recently-active unique movies/shows (by latest watch/activity)
// considered for genre/taste analysis, on top of every *rated* title
// (always included regardless of recency — ratings are the strongest,
// most bounded taste signal; see docs/stats.md, "Provider metadata
// strategy"). This keeps hydration bounded no matter how many titles a
// user has watched over the app's lifetime; a long-unrated title outside
// this window simply doesn't contribute to genre-exposure ranking. Set
// generously — almost every real account's full history fits inside it.
export const TASTE_RECENT_MOVIE_HYDRATION_LIMIT = 150;
export const TASTE_RECENT_SHOW_HYDRATION_LIMIT = 150;

// Top-billed cast members considered per title for actor taste — mirrors
// the display convention MovieCastRow/ShowCastRow already use (TMDB
// returns cast pre-sorted by billing order); this is a smaller slice
// since it's a ranking signal, not a display list, and credits are only
// ever fetched for *rated* titles (see docs/stats.md).
export const TASTE_PRIMARY_CAST_LIMIT = 10;

// A show counts as "meaningfully watched" for title-level taste once at
// least one regular (non-Special) episode has been watched — see
// docs/stats.md, "Show eligibility for taste". A deliberate
// simplification with a documented limitation: one accidentally-watched
// episode carries the same title-level weight as a completed series.
export const MIN_REGULAR_EPISODES_FOR_SHOW_TASTE_ELIGIBILITY = 1;

// --- Sample-size thresholds ---------------------------------------------

// A genre needs at least this many *rated* titles before its average
// rating is treated as meaningful (see docs/stats.md, "Statistical
// reliability").
export const MIN_RATED_TITLES_FOR_GENRE = 2;
// A genre needs at least this many watched titles (rated or not) before
// it's surfaced as a "most-watched" genre.
export const MIN_WATCHED_TITLES_FOR_GENRE = 2;
// The user needs at least this many total distinct watched titles before
// "most/highest-rated genre" is attempted at all.
export const MIN_TOTAL_TITLES_FOR_GENRE_INSIGHT = 3;

export const MAX_GENRE_INSIGHTS = 5;

// A director/actor needs at least this many *rated* titles before being
// declared a favorite — one great rating is evidence of one great movie,
// not a favorite creative person (see docs/stats.md, "Director/actor
// minimum threshold").
export const MIN_RATED_TITLES_FOR_DIRECTOR = 2;
export const MIN_RATED_TITLES_FOR_ACTOR = 2;

export const MAX_FAVORITE_DIRECTORS = 3;
export const MAX_FAVORITE_ACTORS = 5;

export const MIN_RATINGS_FOR_DISTRIBUTION = 5;
export const MIN_RATINGS_FOR_TYPE_AVERAGE = 2;

export const MIN_TRACKED_SHOWS_FOR_COMPLETION_TENDENCY = 3;
// At or below this dropped-show ratio, the user "usually finishes what
// they start" — see docs/stats.md, "Completion behavior".
export const FINISHES_TENDENCY_MAX_DROPPED_RATIO = 0.15;

// Rewatch rate's denominator (unique movies + unique eligible shows)
// needs at least this many titles before the percentage means anything.
export const MIN_UNIQUE_TITLES_FOR_REWATCH_RATE = 3;
// "Most rewatched movie" requires at least one real rewatch (watched
// twice); a single viewing is never a rewatch.
export const MIN_WATCH_COUNT_FOR_MOST_REWATCHED_MOVIE = 2;
// "Most revisited show" requires at least two rewatched episode
// instances — one accidental double-play of a single episode isn't a
// "most revisited show" claim.
export const MIN_REWATCH_INSTANCES_FOR_MOST_REVISITED_SHOW = 2;

export const MIN_UNIQUE_TITLES_FOR_MOVIE_VS_SHOW = 4;

// --- Viewing timeline ----------------------------------------------------

// The timeline always covers exactly this many trailing calendar months
// (including the current one) — see docs/stats.md, "Viewing timeline".
// This is a behavioral-rhythm chart, not a Year in Review: it always
// looks back a rolling 12 months from today, never a calendar year.
export const STATS_TIMELINE_MONTHS = 12;

// --- Viewing time estimate -------------------------------------------------

// Viewing time is estimated only from the same bounded, hydrated title
// set every other provider-dependent insight already uses (see
// hydration-selection.ts) — no extra fetches. `coverageRatio` is the
// fraction of the user's *entire* lifetime viewing-event count that
// estimate actually covers (hydrated titles with a known runtime); below
// this threshold the estimate is withheld entirely rather than shown as
// false precision (see docs/stats.md, "Viewing time"). A history large
// enough to exceed the hydration bound naturally lowers coverage and
// loses the estimate — an honest outcome, not a special case.
export const MIN_RUNTIME_COVERAGE_RATIO = 0.6;

// --- Comparison ----------------------------------------------------------

// A Movie/Show-vs-TV balance shift needs to move by at least this many
// percentage points before it's worth a comparison sentence — see
// docs/stats.md, "Comparison": a 1-point wobble in a small sample isn't a
// real behavioral shift worth calling out.
export const MIN_MOVIE_VS_SHOW_SHIFT_POINTS = 10;
