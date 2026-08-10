# Stats

`/stats` is a top-level primary destination — "what does my own viewing
history and taste actually say about me?" — deliberately separate from
Library (`/library`, "what's my current state with each title?") and Diary
(`/library/diary`, "what have I actually watched and when?"). This document
covers the domain model and architecture behind it.

## Stats is derived, not a new source of truth

There is no `stats` table, and no field anywhere in `src/server/stats/`
is ever persisted as a source of truth. Every insight is computed at
request time from:

- watch history (`movie_watch_events` / `episode_watch_events` —
  see `docs/tracking.md`)
- explicit Show Tracking State (`show_tracking_state`)
- personal ratings (`media_ratings` — see `src/server/opinions/`)
- normalized TMDB metadata (genres, credits, runtime)

`getStatsProfile()` (`src/server/stats/compose.ts`) is the one server
entrypoint. It owns the session boundary; every lower-level query in
`src/server/stats/` is explicitly `userId`-scoped, never session-aware
itself — the same layering `getLibraryPage`/`getDiaryPage` already use.

## Information architecture

Conceptually, Stats covers: Overview, Viewing rhythm, Taste (genres),
People (directors/actors), Rewatching, and Viewing patterns (Movie vs
Show, Show completion tendency) — but this is **not** implemented as
tabs or mechanically-boxed sections. `/stats` is one page, composed
editorially: an opening headline + count line (`StatsHero`), a 12-month
viewing-rhythm chart (`StatsTimeline`), then curated Genre, People,
Rewatch, Patterns, and Ratings sections. Every section omits itself
entirely when its underlying evidence is too thin to be meaningful —
there is no "not enough data" placeholder anywhere on this page.

`src/features/stats/` files prefixed `taste-*` are specifically the
Taste (genre/people) part of that composition — kept as their own
vocabulary since they represent a distinct analytical concept, not
because Taste is a separate product surface anymore.

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

1. **Recency + rating bound.** `selectHydrationIds`
   (`hydration-selection.ts`) always includes every *rated* title
   (ratings are the strongest, most bounded taste signal — a user's
   rating count is inherently small relative to total watch history)
   plus every explicit "must include" title (the single most-rewatched
   Movie / most-revisited Show, computed cheaply from SQL aggregates, so
   it can always be displayed with real artwork). Remaining slots up to
   `TASTE_RECENT_MOVIE_HYDRATION_LIMIT` / `TASTE_RECENT_SHOW_HYDRATION_LIMIT`
   (150 each) go to the most recently active unrated titles. This keeps
   provider hydration bounded regardless of total lifetime watch count —
   a title outside this window and never rated simply doesn't contribute
   to genre-exposure ranking.
2. **Credits only for rated titles.** People (director/actor) ranking
   needs credits (`getMovieCredits`/`getShowAggregateCredits`) — the most
   expensive provider component — so credits are fetched only for
   titles the user has actually rated, a strictly smaller set than the
   hydration bound above.

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

## Rating semantics

A title's current personal rating counts **once**, regardless of
rewatch count — a Movie watched four times with a 5-star rating
contributes one `5`, not four, to any genre/director/actor average
(rewatches are a separate behavioral signal — see "Rewatch insights"
below). Clearing a rating removes it from every rating-based
calculation immediately (nothing is cached beyond the request).

### Statistical reliability

Every rating-based insight has an explicit minimum-sample threshold
(`src/server/stats/constants.ts`) — never a guess from one data point:

- a genre needs ≥2 rated titles before its average is shown
  (`MIN_RATED_TITLES_FOR_GENRE`)
- a director/actor needs ≥2 rated titles before being called a favorite
  (`MIN_RATED_TITLES_FOR_DIRECTOR`/`_ACTOR`)
- a rating distribution needs ≥5 ratings (`MIN_RATINGS_FOR_DISTRIBUTION`)
- a Movie/Show rating comparison needs ≥2 ratings on *each* side
  (`MIN_RATINGS_FOR_TYPE_AVERAGE`) — one side is never rendered as zero
  for lack of data; the whole comparison is omitted instead.

## People ranking

Directors and Actors are ranked purely from the user's own rated
viewing history — average personal rating (desc), then rated-title
count (desc) as a tie-breaker, then name (asc) as the final
deterministic fallback. **TMDB popularity is never a signal.** Directors
are Movie-focused this phase (a Show's per-episode directors are noisy,
not a meaningful "favorite director" signal); Actors combine Movie and
Show participation. Actor ranking uses only the top-billed cast per
title (`TASTE_PRIMARY_CAST_LIMIT`, 10 — mirrors the existing
`MovieCastRow`/`ShowCastRow` display convention of trusting TMDB's own
billing order), so a tiny cameo never carries the same weight as a
primary role.

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
completed" count is a deliberate, documented cut for this phase.

## Viewing timeline

A rolling 12-month behavioral-rhythm chart (`STATS_TIMELINE_MONTHS`),
counting viewing **events** (Movies + Episodes, rewatches included —
this correctly reflects real viewing volume). Always relative to today,
never a fixed calendar year — this is not a Year in Review. Buckets by
UTC calendar month rather than the viewer's real local timezone: unlike
Diary's per-entry day labels (which a user directly compares against
their own clock), a monthly bucket is coarse enough that a timezone
shift only matters for events within hours of a month boundary, and
computing it server-side keeps the aggregation one pure, testable
function (`timeline.ts`) rather than needing Diary's pre/post-mount
reconciliation. `getRecentViewingTimestamps` (`aggregates.ts`) is the
one place this domain fetches raw timestamps rather than a SQL
aggregate — bounded to the trailing window, so row count stays
reasonable regardless of total lifetime history size. Weekday/time-of-day
viewing patterns are deliberately deferred (see "Deferred" below).

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

`Stats` is a primary destination (`src/config/navigation.ts`), not part
of Library's `LibrarySectionNav` (Library/Diary only). Its icon is
`ChartNoAxesColumn` — a plain column shape with no axis lines, chosen to
read as "insight/visualization" without the corporate-dashboard
connotation a gauge/speedometer icon would carry.

## Privacy / caching

`getStatsProfile()` reads `requireSession()` and is therefore inherently
per-request/per-user — never statically generated, never a candidate for
shared/public caching, the same rule as Library/Diary/Home. TMDB's own
responses used to hydrate titles may still use Next's normal public
fetch caching (24h `next.revalidate`); that stays a separate,
provider-owned concern from the private Stats composition wrapping it.

## Future Year in Review reuse

Aggregation helpers that could plausibly need a date range later
(`getRecentViewingTimestamps`, the grouped SQL aggregates) are written
so a `from`/`to` parameter could be added without restructuring — but no
such parameter is exposed today, and `/stats` itself has no date-range
UI. All-time is the only mode this phase implements.

## Deliberately deferred

- **Weekday / time-of-day patterns** — would need either per-event
  local-timezone bucketing (raising the same "how many raw rows do we
  pull" question the 12-month timeline window already manages
  carefully) or an assumption about backdated entries' synthetic times
  that isn't safe to make. Omitted rather than guessed.
- **Exact Show completion count** — see "Show completion behavior"
  above.
- Year in Review, taste-based recommendations, AI-generated taste
  descriptions, public profiles/sharing, leaderboards, streaks,
  achievements, custom date-range filtering, note analysis, and
  personalizing Home/Discover from Stats — all explicitly out of scope
  for this phase.
