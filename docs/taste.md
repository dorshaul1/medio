# Taste

Taste is Stats' second tab (`/stats?tab=taste`) — "what do I tend to
watch and enjoy?" — personal genre/people/rewatch insight, alongside
Overview's *temporal* viewing activity (date ranges, comparison,
rhythm). See `docs/stats.md` for the shared route/tab/range
architecture; this document covers Taste's own insight semantics. Taste
is **not** a Library destination — `/library/taste` (its old route)
redirects here rather than being maintained as a second implementation.

Taste shares Overview's selected date range (`?range=`) — genre/people/
rewatch insight for "2026" is a real, different answer from "All time",
computed from the same range-scoped `StatsProfile` Overview's own tab
renders from (one fetch serves both tabs; see `docs/stats.md`,
"Information architecture"). There is no second, Taste-only range
control.

## Taste is derived, not a new source of truth

There is no `taste` table, and no analytical output is ever persisted.
Every insight is computed at request time from:

- watch history (`movie_watch_events` / `episode_watch_events` — see
  `docs/tracking.md`)
- explicit Show Tracking State (`show_tracking_state`)
- normalized TMDB metadata (genres, credits, runtime)

`getStatsProfile()`/`getStatsComparison()` (`server/stats/compose.ts`)
are the same two server entrypoints Overview uses — there is no separate
Taste entrypoint. The Taste tab simply renders a different subset of the
one `StatsProfile` fields Overview also renders from (genres, directors,
actors, rewatch — never viewing-rhythm chart or Compare, which stay
Overview-only). Every lower-level query in `server/stats/` is explicitly
`userId`-scoped.

MEDIO has no personal rating feature (see `docs/opinions.md`) — every
taste signal here is **exposure-based**: what the user actually watches
and rewatches, not star ratings. Rewatches are the strongest available
implicit preference signal.

## Information architecture

`StatsTabs` (Overview | Taste) sits directly under the shared
`StatsRangeControl` — see `docs/stats.md`, "Information architecture".
Taste has no date-range control of its own.

The tab composes editorially:

1. Opening headline + optional supporting counts (`TasteHero`)
2. Genre exposure (`TasteGenreSection`)
3. Favorite people — directors and actors (`TastePeopleSection`)
4. Rewatching behavior (`TasteRewatchSection`)

Movie vs Show balance and show completion tendency (`StatsPatternsSection`)
now render on the Overview tab instead — both describe viewing
*behavior*, the same job as Overview's other sections, not genre/people
preference. See `docs/stats.md`.

Every section omits itself entirely when evidence is too thin — no
"not enough data" placeholders.

## Title-level vs viewing-event semantics

Genre and People taste analysis is **title-level**: a Movie counts once;
a Show counts once regardless of episode count. Episode count belongs to
*viewing volume* in the overview line, never to genre/People title
counting. A title with multiple genres contributes fully to each genre
(a simple, consistently-applied full count). See `server/stats/genres.ts`,
`server/stats/people.ts`.

### Show eligibility

A Show counts as "meaningfully watched" for title-level taste once at
least one regular (non-Special) episode has been watched
(`MIN_REGULAR_EPISODES_FOR_SHOW_TASTE_ELIGIBILITY`, currently 1).

## Provider metadata strategy

Same bounded hydration as Stats — see `docs/stats.md`, "Provider metadata
strategy". TMDB metadata stays external; nothing is mirrored into
Postgres. Recency-bound title selection plus must-include rewatch titles;
credits fetched only for a smaller, most-recently-active subset
(`TASTE_CREDITS_HYDRATION_LIMIT`).

## People ranking

Directors and Actors are ranked by **title exposure** within the
credits-hydration window — how many hydrated titles this person appears
in (desc), then name (asc) as a deterministic tie-breaker. TMDB
popularity is never a signal. Directors are Movie-focused; Actors combine
Movie and Show participation. Actor ranking uses top-billed cast per title
(`TASTE_PRIMARY_CAST_LIMIT`, 10).

## Rewatch insights

- **Most rewatched Movie** — highest total watch count; requires ≥2 watches.
- **Most revisited Show** — Show-level aggregation from episode rewatch
  counts; requires ≥2 rewatched episode instances. Never called a
  "favorite show" — rewatch ≠ favorite.
- **Rewatch rate** — percentage of unique watched titles (Movies +
  meaningfully-watched Shows) that received at least one rewatch.

Movie vs Show balance and show completion tendency are Overview-tab
sections now (`StatsPatternsSection`) — see `docs/stats.md`, "Movie vs
Show comparison" and "Show completion behavior".

## Viewing time

Estimated from the same bounded, hydrated title set — no extra provider
fetches. Withheld below `MIN_RUNTIME_COVERAGE_RATIO` (0.6). UI shows
rounded "~N hours" only.

## Sample-size thresholds

All thresholds live in `server/stats/constants.ts` — see `docs/stats.md`,
"Statistical reliability". Taste never declares a genre or favorite person
from a single data point.

## Privacy / caching

`getStatsProfile()`/`getStatsComparison()` (the same entrypoints
Overview uses) read `requireSession()` and are per-request/per-user —
never shared/public cached. TMDB's own fetch caching stays a separate,
provider-owned concern.

## Pick for Me

Pick's own taste projection (`server/pick/taste-summary.ts`) shares the
same pure ranking functions Taste uses — but always calls the underlying
aggregate queries with `null` bounds (all time), never the Stats UI's
currently-selected range. Pick reasons over the user's entire history
regardless of what a user happens to have `/stats` set to; see
`docs/stats.md`, "Stats + Pick for Me".

## Future Year in Review reuse

The underlying range-aware aggregate queries in `server/stats/` are the
reusable foundation for a future Year in Review — but Year in Review
itself (a distinct narrative experience) remains out of scope. Taste is
now range-scoped like Overview, but still has no date-range control of
its own — a future Year in Review is a separate, dedicated UI, not "set
Taste's range to a year."

## Deliberately deferred

Year in Review, taste-based recommendations, AI-generated descriptions,
public profiles, streaks, note analysis, personalizing Home/Discover from
Taste, and reaction analytics — all explicitly out of scope.
