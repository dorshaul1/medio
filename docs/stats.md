# Stats

`/stats` is a top-level primary destination — "what does my own viewing
history and taste actually say about me?" — deliberately separate from
Library (`/library`, "what's my current state with each title?") and Diary
(`/library/diary`, "what have I actually watched and when?"). It has two
tabs: **Overview** ("how have I been watching?" — viewing activity/
rhythm) and **Taste** ("what do I tend to watch and enjoy?" — genres,
favorite people, rewatches). This document covers the domain model and
architecture behind both.

## Stats is derived, not a new source of truth

There is no `stats` table, and no field anywhere in `src/server/stats/`
is ever persisted as a source of truth. Every insight is computed at
request time from:

- watch history (`movie_watch_events` / `episode_watch_events` —
  see `docs/tracking.md`)
- explicit Show Tracking State (`show_tracking_state`)
- normalized TMDB metadata (genres, credits, runtime)

MEDIO has no personal rating feature (see `docs/opinions.md`) — every
taste signal below is derived from real watch behavior (what's watched,
how often, and rewatches), never a star rating.

`getStatsProfile()` (`src/server/stats/compose.ts`) is the one server
entrypoint. It owns the session boundary; every lower-level query in
`src/server/stats/` is explicitly `userId`-scoped, never session-aware
itself — the same layering `getLibraryPage`/`getDiaryPage` already use.

## Information architecture

One route, one date range, two tabs (`StatsTabs` — `?tab=overview`, the
default, or `?tab=taste`). The date-range control
(`StatsRangeControl`) sits above the tabs because it governs both:
switching tabs never changes or resets the selected range, and switching
range never changes the selected tab — both are independent, real URL
state (`?range=`, `?compare=`, `?tab=`) read once at the top of
`app/(app)/stats/page.tsx`.

The page fetches exactly one `StatsProfile` (or one
`{ current, previous }` pair when Compare is on) for the selected range
— `StatsProfile` already carries every field either tab renders (see
"The composed projection" via `server/stats/types.ts`), so switching
tabs is a pure rendering choice, never a second query. This is why Taste
moved here rather than staying a separate `/library/taste` route: it was
always the same `buildStatsProfile` projection under a different URL,
computed with `{ kind: "all" }` regardless of what a user actually
wanted to look at. As a tab, Taste now shares Overview's real selected
range — "genres/people/rewatches for 2026" is a meaningfully different,
now-supported answer from "genres/people/rewatches all time".

- **Overview** — an opening volume statement (`StatsHero`), an optional
  Compare summary (`StatsComparisonSection`), the viewing-rhythm chart
  (`StatsTimeline`), the weekday breakdown (`StatsWeekdaySection`), and
  Movie-vs-Show/completion (`StatsPatternsSection`).
- **Taste** — a taste headline (`TasteHero`), genre exposure
  (`TasteGenreSection`), favorite people (`TastePeopleSection`), and
  rewatch highlights (`TasteRewatchSection`) — all from `features/taste/`.

Every section on either tab omits itself when evidence is too thin — see
"Statistical reliability" below.

## Date ranges

`?range=` is real URL state (`server/stats/range.ts`'s
`parseStatsRangeParam`/`formatStatsRangeParam`) — `all`, the current
calendar year, the current calendar month, `last12months`, a specific
year (`2025`), or a specific month (`2026-08`). `StatsRangeControl`
only ever exposes three static chips, always in this order — **All
time**, **This year**, **This month** — no year-number chip, no
overflow "More" picker; a specific past year stays reachable by direct
URL (`?range=2025`) without being promoted in the UI.

When `?range=` is absent entirely, the landing range comes from the
user's own **Default Stats range** preference (Settings → Defaults;
`statsDefaultRange` — `all`/`year`/`month`, defaulting to `all`)
resolved against the current date (`resolveDefaultStatsRange`) —
never hardcoded to one specific range for every user. `StatsRangeControl`
and the page's own default always agree because both read the same
resolved value; the control never has its own separate notion of
"default." `StatsRange` is resolved to a half-open `[start, end)` UTC
bound (`resolveStatsRangeBounds`) — reusing Diary 2.0's own month-scoping
convention exactly (see docs/diary.md, "Month navigation and timezone")
rather than inventing a second timezone interpretation: the server can't
know the viewer's real local timezone, so a period edge can be off by at
most a few hours, an accepted documented tradeoff at this granularity. A
`null` bound means "all time," unbounded.

Every range-aware query (`getViewingVolume`, `getMovieWatchAggregates`,
`getShowWatchAggregates`) takes this bound as a plain parameter and adds
`and watched_at >= start and watched_at < end` only when it's non-null —
the exact same shape `server/diary/events.ts`'s own `period` filter
uses. The pure insight-computation layer (genres/people/rewatch/movie-vs-
show/headline/viewing-time) is completely unaware ranges exist at all —
it only ever sees whatever titles/aggregates the range-scoped queries
already produced, so none of those files changed for Stats 2.0.

**Show Tracking State counts** (`getTrackingStateCounts`, feeding
Completion/TV Journey) are deliberately **never** range-scoped — a
show's `watching`/`on_hold`/`dropped` status describes its *current*
state, not a dated event, so it reflects "right now" regardless of the
selected range.

### Historical years

`getActiveStatsYears`/`getStatsActiveYears` (`aggregates.ts`/
`compose.ts`) return only years with real watch history, newest first —
used only to decide whether the page has *any* history at all (see
below), since the range control itself no longer exposes per-year chips.
A brand-new account (no active years at all) sees Stats' one true empty
state ("No stats yet.") with no range control at all; an account with
real history elsewhere but nothing in the *selected* range sees a
sparse-range message ("Nothing watched in {range}.") with the range
control still fully usable — the same empty-vs-sparse distinction
Diary's own month-scoped browsing already makes (see docs/diary.md,
"Empty vs. sparse").

### Comparison

`getStatsComparison` (`compose.ts`) computes the current range's profile
and its immediately-preceding equivalent period
(`resolvePreviousStatsRangeBounds` — real calendar arithmetic, never a
ms-duration shift of the current bounds, which would misalign a
"previous year" across a leap year) in parallel, then
`deriveStatsComparison` (`compare.ts`, pure) turns the two profiles into
a small set of already-composed human-language facts — never a raw
`{ metric, delta, percent }` tuple the UI phrases itself, and never
red/green up/down judgment (see CLAUDE.md, "No judgment"). Only
genuinely different facts appear (a Movies/Shows/Episodes count that
didn't change produces no fact at all); a Movie-vs-Show balance shift
needs to clear `MIN_MOVIE_VS_SHOW_SHIFT_POINTS` (10 percentage points)
before it's worth mentioning. "All time" has no meaningful previous
period, so Compare is hidden entirely for it
(`statsRangeSupportsComparison`).

The previous period's profile is built via the same `buildStatsProfile`
path as the current one — never a second, parallel computation — with a
`lightweight` flag that skips work Comparison's own UI never renders
(director-portrait hydration, the rhythm/weekday charts), saving real
provider requests rather than doubling them. Compare is Overview-only —
Taste has no comparison UI of its own.

`src/features/taste/` owns Taste's own section components (rendered from
the Taste tab); `src/features/stats/` owns Overview's section components
plus the shared range/tab controls. Pure analytics helpers live in
`src/server/stats/` — shared by both tabs and by Pick for Me.

## Title-level vs viewing-event semantics

A media title can carry multiple genres; a title watched carries full
participation in each of them (a simple, consistently-applied full
count, not fractional attribution). Genre/People taste analysis is
**title-level**: a Movie counts once; a Show counts once, regardless of
how many episodes were watched. Episode count belongs to *viewing
volume* (unique episodes watched, total episode events), never to
genre/People title counting — a Show with 62 watched episodes
contributes exactly one unit of "watched" per genre, the same as a
Movie. See `src/server/stats/genres.ts`, `people.ts`.

### Show eligibility for taste

A Show counts as "meaningfully watched" for title-level taste only once
at least one **regular** (non-Special) episode has been watched
(`MIN_REGULAR_EPISODES_FOR_SHOW_TASTE_ELIGIBILITY`, currently 1) — a
documented, deliberate simplification: one accidentally-watched episode
carries the same title-level weight as a completed series.

## Provider metadata strategy

TMDB metadata stays external (see `docs/media-provider.md`); Stats never
mirrors the catalog into Postgres. But historical analytics can
reference years of provider IDs, so hydration is deliberately bounded in
two ways:

1. **Recency bound.** `selectHydrationIds` (`hydration-selection.ts`)
   always includes every explicit "must include" title (the single
   most-rewatched Movie / most-revisited Show, computed cheaply from SQL
   aggregates, so it can always be displayed with real artwork); the
   remaining slots up to `TASTE_RECENT_MOVIE_HYDRATION_LIMIT` /
   `TASTE_RECENT_SHOW_HYDRATION_LIMIT` (150 each) go to the most
   recently active titles. This keeps provider hydration bounded
   regardless of total lifetime watch count — a title outside this
   window simply doesn't contribute to genre-exposure ranking.
2. **Credits only for a smaller, most-recently-active subset.** People
   (director/actor) ranking needs credits (`getMovieCredits`/
   `getShowAggregateCredits`) — the most expensive provider component —
   so a second, smaller `selectHydrationIds` pass (bounded by
   `TASTE_CREDITS_HYDRATION_LIMIT`, 60) picks which of the already-
   selected titles above actually get a credits fetch, independent of
   total lifetime history size.

Show creators (for the "Created by" concept) and a show's typical
episode runtime come free from the same `getShowDetails` fetch already
used for genres — no extra request. Favorite Actors' portraits come free
from the same per-title cast credits used for ranking; only Favorite
Directors need one small, final, bounded hydration pass
(`getPersonDetails`, at most `MAX_FAVORITE_DIRECTORS` requests) after
ranking, since `CreditedPerson` carries no profile image.

A single title's hydration failure never breaks the rest of the
profile — it's simply omitted, the same graceful-degradation contract
`server/library/compose.ts`/`server/diary/hydrate.ts` already apply.

## Watch history aggregation

`src/server/stats/aggregates.ts` and `candidates.ts` are pure SQL
aggregation — `count`, `count(distinct ...)`, `group by`,
`filter (where ...)` — never a fetch of every raw event row just to
report a count or grouping. Result-set size for the grouped queries is
bounded by the user's number of *unique* titles, not their event count —
cheap even for a user with thousands of rewatches of a handful of shows.

### Statistical reliability

Every exposure-based insight has an explicit minimum-sample threshold
(`src/server/stats/constants.ts`) — never a guess from one data point:

- a genre needs ≥2 watched titles before it's surfaced as "most watched"
  (`MIN_WATCHED_TITLES_FOR_GENRE`), and the user needs ≥3 total distinct
  watched titles before genre insight is attempted at all
  (`MIN_TOTAL_TITLES_FOR_GENRE_INSIGHT`)
- a director/actor needs ≥2 titles (within the credits-hydrated subset)
  before being called a favorite (`MIN_TITLES_FOR_DIRECTOR`/`_ACTOR`)

## People ranking

Directors and Actors are ranked purely from how many of the user's own
hydrated, credits-eligible titles they appear in (desc), then name (asc)
as the final deterministic fallback. **TMDB popularity is never a
signal.** Directors are Movie-focused this phase (a Show's per-episode
directors are noisy, not a meaningful "favorite director" signal);
Actors combine Movie and Show participation. Actor ranking uses only the
top-billed cast per title (`TASTE_PRIMARY_CAST_LIMIT`, 10 — mirrors the
existing `MovieCastRow`/`ShowCastRow` display convention of trusting
TMDB's own billing order), so a tiny cameo never carries the same weight
as a primary role.

## Rewatch insights

- **Most rewatched Movie** — the Movie with the highest total watch
  count, ties broken by most recent watch then id; requires ≥2 total
  watches (`MIN_WATCH_COUNT_FOR_MOST_REWATCHED_MOVIE`).
- **Most revisited Show** — aggregated to Show level from episode
  rewatch counts (Specials included — a rewatched Special is still a
  real rewatch); requires ≥2 rewatched episode instances
  (`MIN_REWATCH_INSTANCES_FOR_MOST_REVISITED_SHOW`). Deliberately never
  called a "favorite show" — rewatch ≠ favorite.
- **Rewatch rate** — the percentage of unique watched titles (Movies +
  meaningfully-watched Shows) that received at least one rewatch. A
  Movie counts as rewatched once watched twice; a Show counts once any
  one of its episodes has been watched more than once. This is
  deliberately *not* "extra viewing events / total events" — that
  answers a different question (viewing-volume share, not "what
  fraction of what I watched did I come back to"). Requires ≥3 unique
  titles in the denominator (`MIN_UNIQUE_TITLES_FOR_REWATCH_RATE`).

## Movie vs Show comparison

Based on **unique titles** watched, never viewing events — a Movie
viewing and an Episode viewing aren't comparable units, so mixing them
would be misleading. Requires ≥4 total unique titles
(`MIN_UNIQUE_TITLES_FOR_MOVIE_VS_SHOW`); still shown (as a lopsided
split) when a user only watches one media type — that's a real, honest
answer, not an error case.

## Show completion behavior

TMDB's own show status plus exact episode air-date data would be needed
to compute a true per-show "Completed" count, which would mean an
N×season provider fetch across every Show the user has ever tracked —
exactly the request-explosion architecture this app forbids (see
`docs/architecture.md`). Instead, completion behavior uses only
`show_tracking_state`'s already-cheap explicit counts (`watching` /
`on_hold` / `dropped`) to derive a **neutral tendency** —
`"finishes"` (dropped ratio ≤15%) or `"explores"` (higher) — never a
shaming label, requires ≥3 explicitly tracked shows
(`MIN_TRACKED_SHOWS_FOR_COMPLETION_TENDENCY`). A true "N shows
completed" count is a deliberate, documented cut for this phase. This
insight is never range-scoped (see "Date ranges" above) — it always
reflects current tracking state.

## Viewing rhythm and range

The viewing-rhythm chart's bucket granularity follows the selected range
— never a 10-year, 120-column monthly chart, and never a meaningless
12-entry monthly chart for one selected month (`computeViewingRhythm` —
`compose.ts`):

- **"All time"** — bucketed by real calendar **year**, from one bounded
  SQL aggregate (`getYearlyActivityCounts`) — never a raw lifetime
  timestamp pull.
- **A specific year, or "Last 12 months"** — bucketed by **month**,
  exactly the original 12-entry chart (`computeMonthlyActivity`,
  `STATS_TIMELINE_MONTHS`), reused unchanged: a specific past year's
  Jan-Dec is just the trailing-12-month window ending at that year's own
  January 1st of the *following* year.
- **A specific month** — bucketed by **day** (`computeDailyActivity`),
  the one case a 12-entry monthly chart can't represent meaningfully.

Every granularity counts viewing **events** (Movies + Episodes,
rewatches included — this correctly reflects real viewing volume), and
every bucket includes zero-activity periods (a real gap is real
information, never hidden). All three shapes flow through one generic
`ActivityBucket`/`ViewingRhythm` type the chart component
(`StatsTimeline`) renders identically regardless of which granularity
produced it. Buckets by UTC calendar boundaries rather than the viewer's
real local timezone — the same documented simplification Diary's own
month-scope query boundary uses (see "Date ranges" above), and for the
same reason: unlike Diary's per-entry day *labels* (which a user directly
compares against their own clock), a chart bucket is coarse enough that a
timezone shift only matters for events within hours of a boundary, and
computing it server-side keeps the aggregation pure and testable rather
than needing Diary's pre/post-mount reconciliation.
`getViewingTimestampsInRange`/`getYearlyActivityCounts` (`aggregates.ts`)
are the only two places this domain ever fetches/aggregates timestamps
for the chart — always bounded to the selected range, never the user's
unbounded lifetime.

### Weekday rhythm

`computeWeekdayActivity` (`timeline.ts`) reuses the exact same
`timestamps` array already fetched for the rhythm chart above — never a
second query — so it's only available for range kinds that fetch raw
timestamps at all ("month"/"year"/"last12months"); **"All time" omits
it** rather than pulling an unbounded lifetime timestamp set just for
this one insight. Bucketed by UTC day-of-week, the same documented
simplification the monthly chart already uses. Requires
`MIN_EVENTS_FOR_WEEKDAY_INSIGHT` (8) events in range before rendering —
a handful of events scattered across a week is coincidence, not a
rhythm — and states no single "most active day" when every day is
exactly tied, though the bar breakdown itself still renders. Time-of-day
(clock-hour) patterns remain deliberately deferred — see "Deferred"
below; a date-only imported event has no real time to bucket by, and
this domain never fabricates one.

### Stats + Diary

The chart's single busiest bucket, when month-granularity, links
directly into that month's real chronology in Diary
(`/library/diary?month=YYYY-MM`) — the one deliberate Stats→Diary
integration this phase adds (see CLAUDE.md, "Stats + Diary"). Never
shown for day/year granularity, where "a month" isn't the unit being
charted at all.

## Viewing time

Estimated only from the same bounded, hydrated title set every other
provider-dependent insight already uses — **no extra provider fetches**.
A Movie contributes `runtimeMinutes × watchCount` (every viewing,
rewatches included). A Show contributes its own typical
`episodeRuntimeMinutes × totalEpisodeEvents` — TMDB's one approximate
per-episode figure for the whole show, applied to every episode event,
not a true per-episode runtime (a true figure would need a fetch per
watched episode, which this architecture avoids).

`coverageRatio` measures, in **events** (not titles), what fraction of
the user's entire lifetime viewing-event count the estimate actually
covers. Below `MIN_RUNTIME_COVERAGE_RATIO` (0.6), the estimate is
withheld entirely rather than shown as false precision. A history large
enough to exceed the hydration bound naturally lowers coverage and loses
the estimate — an honest, self-consistent outcome, not a special case.
The UI never shows raw minutes ("38,472 minutes") — only a rounded
"~N hours" figure.

## Navigation

`Stats` is a primary destination (`src/config/navigation.ts`), covering
both tabs — Taste is not a separate nav entry and is not part of
`LibrarySectionNav` (which now covers Library/Diary only). Stats' icon is
`ChartNoAxesColumn` — a plain column shape with no axis lines.
`/library/taste` (the old Taste route) redirects to `/stats?tab=taste`
rather than 404ing for anyone with the old URL bookmarked or linked —
there is exactly one canonical Taste implementation.

## Privacy / caching

`getStatsProfile()` reads `requireSession()` and is therefore inherently
per-request/per-user — never statically generated, never a candidate for
shared/public caching, the same rule as Library/Diary/Home. TMDB's own
responses used to hydrate titles may still use Next's normal public
fetch caching (24h `next.revalidate`); that stays a separate,
provider-owned concern from the private Stats composition wrapping it.

## Stats + Pick for Me

Pick's own taste projection (`server/pick/taste-summary.ts`) shares the
same *pure* ranking functions Stats uses (`computeGenreInsights`,
`computeFavoriteDirectors`, `hydrateTasteTitles`, `selectHydrationIds`)
— but always calls `getMovieWatchAggregates`/`getShowWatchAggregates`
with `null` bounds (all time), never a Stats UI date range. Pick reasons
over the user's entire history regardless of whatever range a user
happens to have last selected on `/stats`; the two features share
derived domain-level helpers, never a live dependency on Stats' own UI
projection (see CLAUDE.md, "Stats + Pick for Me").

## Future Year in Review reuse

Stats 2.0's own range infrastructure (`server/stats/range.ts`'s
`StatsRange`/bounds resolution, the range-aware aggregate queries) is
exactly the reusable foundation a future Year in Review would need — but
Year in Review itself (a distinct narrative product experience, not just
"Stats with `range=2026`") remains out of scope for this phase, per its
own explicit instruction.

## Deliberately deferred

- **Time-of-day (clock-hour) patterns** — would need either per-event
  local-timezone bucketing (a different, harder problem than the
  weekday breakdown's UTC-day approximation) or an assumption about
  date-only/backdated entries' synthetic times that isn't safe to make.
  Omitted rather than guessed. (Weekday rhythm itself is implemented —
  see "Weekday rhythm" above.)
- **Exact Show completion count** — see "Show completion behavior"
  above.
- **A custom, arbitrary date-range picker** — the four preset ranges
  (All time / a specific year / Last 12 months / a specific month)
  cover every range described in this phase's scope without an
  enterprise date-range control; a custom picker was judged not to
  clearly earn its complexity yet and was cut, not merely missed.
- **Standout/highlight titles with artwork**, a **reactions insight**,
  and a **tiny day-by-day activity strip independent of the rhythm
  chart** — each considered, none judged to clearly earn its place this
  phase over the existing curated sections.
- Year in Review, taste-based recommendations, AI-generated taste
  descriptions, public profiles/sharing, leaderboards, streaks,
  achievements, note analysis, and personalizing Home/Discover from
  Stats — all explicitly out of scope for this phase.
