# Tracking domain

The permanent foundation for personal watch history — `src/server/tracking/`
(server-only domain logic) and `src/server/db/schema/tracking.ts`
(persistence). This phase is domain/persistence only: no product UI reads or
writes any of this yet (see `docs/architecture.md`).

## Viewing events are the source of truth

Watching is never modeled as `isWatched: boolean`. A user can watch a movie
or episode once, several times, out of order, or years apart, and needs to
be able to correct a mistaken entry later. All of that requires real
records, not a flag — so every viewing is a row: `MovieWatchEvent` or
`EpisodeWatchEvent`. `hasWatched`/`watchCount`/`lastWatchedAt` are never
stored directly; they're always derived by reading the events (see
`getMovieWatchSummary`/`getEpisodeWatchSummary` in
`src/server/tracking/movie-events.ts`/`episode-events.ts`).

## Rewatches are just more events

Recording a watch always **inserts**, never upserts or overwrites. Watching
the same movie three times means three `MovieWatchEvent` rows; watching one
episode twice means two `EpisodeWatchEvent` rows. There is deliberately no
unique constraint on `(user, media, watchedAt)` — nothing prevents, or
should prevent, multiple rows for the same media.

## Resetting a show's progress

`resetShowWatchHistory` (`episode-events.ts`) deletes every
`EpisodeWatchEvent` for one show — a full, explicit, user-initiated reset
back to unwatched (Show Details' "Reset progress," confirmed before
running — see `ShowTrackingControl`). This is the one place bulk history
deletion exists, and it is never implicit: no other action (stopping
tracking, going on hold, dropping a show, or removing a single event)
deletes more than the specific rows it names. `show_tracking_state` is
untouched by a reset — a user resetting a rewatch-from-the-start still
wants the show to read as "Watching," just with 0 episodes counted.

## Movies and episodes are separate tables

`movie_watch_events` and `episode_watch_events` are two tables, not one
polymorphic table with nullable show/season/episode columns. A movie only
ever needs its own provider ID; an episode needs its show, season, and
episode coordinates — different identity shapes get different tables, with
real `NOT NULL` columns and real constraints instead of a pile of
nullable fields. The Watch Diary combines both at the query layer (a SQL
`UNION ALL`, never a merged table) — see `docs/diary.md`; the tables
themselves stay simple.

## Explicit Show Tracking State

`show_tracking_state` holds exactly one row per user+show the user has an
**explicit** relationship with, and the `status` column only ever holds one
of three values: `watching`, `on_hold`, `dropped` (enforced both in
TypeScript and with a real database `CHECK` constraint — Drizzle's
`{ enum: [...] }` option is TypeScript-only and doesn't reach the
database). No row at all means "not started" — there is no persisted
`not_started` value.

**Watchlist and Backlog are a different, future domain.** They represent
planning/intent ("I want to watch this eventually"), not viewing progress,
and do not belong in this status enum.

## Derived viewing state is never persisted

`unwatched` / `watching` / `caught_up` / `waiting` / `completed` are
**computed at read time** by `resolveShowViewingState`
(`src/server/tracking/derived-state.ts`), never stored. A persisted
`caught_up` value would go stale the instant a new episode airs — the whole
point of deriving it is that it can't be wrong.

Resolution order:

1. Explicit `on_hold` or `dropped` always wins, regardless of watch history.
2. No relevant watched episodes at all → `unwatched`.
3. Some but not all currently-aired relevant episodes watched →
   `watching`.
4. All currently-aired relevant episodes watched, and the show has
   concluded (not one of TMDB's "ongoing" statuses — see
   `docs/media-provider.md`, "Show status vs. watch status") → `completed`.
5. All currently-aired relevant episodes watched, the show is still
   active, and a future episode is known to be scheduled → `waiting`.
6. All currently-aired relevant episodes watched, the show is still
   active, and no future episode is known → `caught_up`.

`hasKnownFutureEpisode` is supplied by the caller (e.g. from a provider
"next episode to air" field, when a future product surface fetches one) —
the pure resolver never fetches anything itself.

## Canonical domain ownership

One function owns each concept; no consumer surface recomputes it
independently:

- **Aired-episode filtering, "next unwatched episode"** —
  `server/tracking/progress.ts`.
- **Derived viewing state** (`watching`/`caught_up`/`waiting`/`completed`)
  — `resolveShowViewingState`, above.
- **Composed `ShowProgress`** (counts + next episode + derived state in
  one call) — `computeShowProgress`
  (`server/tracking/compute-show-progress.ts`).
- **Fetch-and-compute exact progress for one show** (the one place an
  N-season TMDB fetch happens) — `getShowEpisodeProgress`
  (`server/shows/show-episode-progress.ts`). Show Details, Home
  (`server/home/queries.ts`), and Calendar (`server/calendar/compose.ts`)
  all call this same function with the same effective inputs — Calendar
  additionally threads an explicit `asOf` (see that function's own
  comment for why), which is the only difference in how the three callers
  use it.
- **Home's Up Next/Finish Soon/Continue Watching precedence** —
  `classifyActiveShows` (`server/home/classify.ts`). Pick for Me
  (`server/pick/candidates-continue.ts`) reuses Home's own
  `getPersonalHome()` output directly rather than re-deriving eligibility.

**Library's one deliberate, documented exception:** Library classifies a
show's state from an *approximate* season-level aired-episode count
(`approximate-progress.ts`) rather than the exact per-episode count the
functions above use, to avoid an N-season provider fetch for every visible
Library row. This can occasionally make Library show a title as
"Watching" a few episodes later than Home would (see docs/library.md,
"Show derived state at Library scale") — an accepted Library-scale
tradeoff, not a bug, but the one place two surfaces can genuinely disagree
about a show's labeled state for the same underlying data.

`server/tracking/cross-product-consistency.test.ts` is the regression
suite protecting this: it records real watch events through the real
tracking domain, then asserts Home, Library, Diary, Calendar, and Pick for
Me all agree, across episode-progression, rewatch, exact-event-deletion,
and show-state-transition scenarios (first episode, season finale, next
season already aired, Waiting, Completed, Specials, rewatching an
already-watched episode).

## Progress excludes Specials and future episodes

`computeShowProgress` (`src/server/tracking/compute-show-progress.ts`) is
the one function that turns an episode inventory + watch events into a
`ShowProgress` (aired count, unique watched count, remaining count,
completion ratio, last watched episode, derived state).

- **Specials (season 0) never count toward the denominator.** A show isn't
  "behind" for having unwatched bonus content, and isn't blocked from
  `completed`/`caught_up` by it. Watching a Special still records a real
  `EpisodeWatchEvent` — it just doesn't affect standard progress math.
- **Unaired episodes never count toward the denominator.** An episode with
  no air date on file, or an air date in the future, is never treated as
  something the user needs to watch to be "caught up". A missing air date
  is conservatively treated as *not* aired — never assumed aired.
- **Rewatches never inflate progress.** `uniqueWatchedEpisodeKeys`
  (`src/server/tracking/progress.ts`) collapses N events for one episode
  down to one identity before anything is counted; 3 events for S01E01
  contributes exactly 1 to `uniqueWatchedAiredEpisodeCount`, while
  `watchCount` on that episode's summary still correctly reports 3.
- **"Last watched" uses `watchedAt`, not episode number or event
  creation order.** A user can watch out of order or rewatch an earlier
  episode; the most recent real viewing wins, whichever episode it was.
- **`ShowProgress.nextUnwatchedEpisode`** is the canonical next unwatched,
  aired, regular episode (`progress.ts`'s `nextUnwatchedEpisode`,
  canonical season/episode order — never inferred from watch-event
  creation order or the most recently rewatched episode). Originally
  domain-layer support with no caller; personalized Home's "Up Next" is
  now the first product surface that reads it — see `docs/home.md`.

### Fetching a show's exact progress

`server/shows/show-episode-progress.ts`'s `getShowEpisodeProgress` is the
one place this application fetches every regular season's episodes for a
single show and computes exact progress from them — the deliberate,
narrow exception to "Show Details never eagerly fetches every season's
episodes" (see docs/media-provider.md). Written once, shared by Show
Details (`features/shows/show-tracking-view.ts`) and personalized Home's
bounded active-show candidates (`server/home/`, see docs/home.md) —
neither reimplements this fetch-and-compute logic on its own.

### Progress input boundary

`computeShowProgress`/`resolveShowViewingState`/the `progress.ts` helpers
are pure and synchronous — no I/O, no TMDB calls. They consume an
already-normalized `Episode[]` (`src/server/media/types.ts` — never a raw
TMDB DTO) and the tracking event rows the caller already fetched. Nothing
in this directory fetches provider data itself, and nothing in
`src/server/tmdb/` knows tracking events exist.

Recording a watch event also never requires fetching anything from TMDB —
`recordEpisodeWatch` takes the normalized identity
(show/season/episode/episode-provider-ID) the caller already has and writes
directly. A user can record a watch even if TMDB is temporarily
unreachable.

## Automatic show state on episode watch

`recordEpisodeWatch` (`src/server/tracking/episode-events.ts`) does two
things in one database transaction: inserts the `EpisodeWatchEvent`, and
upserts `show_tracking_state` to `watching` — unconditionally, including
moving a show back from `on_hold` or `dropped`. The reasoning: if a user
watches a new episode of a show they'd paused or dropped, that action
itself communicates they're watching it again: no separate "resume" step
should be required. Both writes succeed or both roll back together.

Deleting an episode (or movie) watch event never touches
`show_tracking_state` — explicit status and watch history are related but
independent. A user can still be explicitly "Watching" a show with zero
recorded episodes (they just started tracking it), and removing a
mis-recorded event must never silently reset their status.

## Correcting a viewing

`watchedAt` may be edited after the fact — `updateMovieWatchedAt`/
`updateEpisodeWatchedAt` (`movie-events.ts`/`episode-events.ts`) correct
exactly one event's timestamp, ownership-scoped the same way every other
per-event mutation here is. There is no way to pass a different movie/
show/season/episode through these functions — an edit can only change
*when* a viewing happened, never *what* was watched. `removeMovieWatchEvent`/
`removeEpisodeWatchEvent` (the latter distinct from `unmarkEpisodeWatched`
— see "Episode row design" below) delete exactly one event by id, so
correcting/removing one rewatch never touches the media's other viewings.
Deleting a specific event naturally recomputes every derived figure that
reads the event rows (watch count, Show progress, Home's Up Next/Continue
Watching/Finish Soon membership) — none of it is a stale persisted copy
that needs separate updating. This is the Watch Diary's own editing
surface — see `docs/diary.md` for the product UI and the unified
cross-type history query built on top of these same tables.

## Planning clears when tracking starts

`recordMovieWatch`, `recordEpisodeWatch`, and `startWatchingShow` (and, by
extension, `putShowOnHold`/`dropShow`) each also clear any Watchlist/
Backlog planning entry for that media, in the same transaction as the
tracking write — a no-op if none exists. This is Tracking's one dependency
on `server/planning/` (never the other direction), and the only place the
two domains touch at all. Planning and Tracking otherwise remain
completely independent tables/reads/writes — see `docs/library.md`,
"Planning clears when tracking starts", for the full reasoning and product
semantics (Watchlist vs. Backlog, why this is a real product rule and not
incidental coupling).

## Ownership and privacy

Every tracking table has a `user_id` foreign key with `ON DELETE CASCADE` —
deleting a user removes all of their tracking rows automatically. Every
function in `src/server/tracking/` derives the acting user from
`requireSession()` itself; none accept a caller-supplied user ID. Every
mutation's `WHERE` clause includes the ownership check directly (e.g.
`and(eq(id, eventId), eq(userId, user.id))`) rather than looking a row up
and trusting it belongs to the caller — a user can never mutate another
user's row by knowing or guessing its ID (see
`src/server/tracking/authorization.test.ts`).

This is private, user-owned data: it must never be placed in a
shared/public cache (TMDB's own responses are cached and can be shared
across users; anything that reads tracking data must stay request/user
scoped) and must never be logged.

## Mutation architecture

Every tracking and planning Server Action (`features/shows/show-tracking-actions.ts`,
`features/movies/movie-tracking-actions.ts`, `features/media/planning-actions.ts`)
calls one shared function, `revalidateTrackingSurfaces`
(`server/mutations/revalidate-tracking-surfaces.ts`), instead of hand-rolling
its own `revalidatePath` list. This exists because that hand-rolling had
already drifted: a hardening audit found several nearly-identical actions
silently revalidating different subsets of the app — putting a show On
Hold didn't refresh Library, marking an episode watched didn't refresh
Diary, marking a movie watched (which clears its planning entry) didn't
refresh Home or Calendar. None of these were deliberate; they were the
predictable result of N call sites each remembering their own list by
hand.

The shared function always revalidates Home (`/`), Calendar, Library,
Stats, and Pick for Me — every one of them composes personalized state
from the same canonical watch-event/planning tables at request time, so
any write that reaches this function can plausibly affect all five.
`/library/diary` is the one conditional surface (`affectsDiary`), since
planning-only writes never touch a Diary-visible event row. Over-
revalidating a route a specific write didn't actually touch is harmless
(Next.js just refetches on the next visit, and none of these routes are
ever statically/shared-cached in the first place — see "Ownership and
privacy" above); silently under-revalidating one is the real, demonstrated
bug class this replaces. A new tracking/planning mutation should call this
function rather than adding its own `revalidatePath` calls.

## Query shape: summaries vs. full history

Reading full watch-event history and reading a summary/progress figure are
different queries with different costs — `getMovieWatchSummary`/
`getEpisodeWatchSummary` don't fetch every rewatch timestamp just to report
a count, and `getSeasonEpisodeWatchSummaries` fetches a whole season's
tracking state in one bulk query (indexed on `(user, show, season)`)
instead of one query per episode, for exactly the reason a Season page
needs it: rendering N episode rows must never cost N round trips.

## UI interaction semantics

Movie Details, Show Details, and Season Details are the tracking UI
surfaces. A few interaction rules the components (not just the domain
layer) rely on:

- **Movie tracking is event-based; episode tracking is a plain toggle —
  deliberately different.** For movies, "Mark watched" always creates a
  new viewing event, and once watched the control becomes "watch again" —
  clicking it again creates another event, never removes the first one
  (rewatches are real, worth-counting history for a whole movie). For
  episodes, `EpisodeWatchControl` is a simple watched/unwatched toggle:
  clicking an unwatched episode marks it watched; clicking a watched
  episode calls `unmarkEpisodeWatched`, which removes its watch event(s)
  entirely. There is no per-episode rewatch count, no episode history
  menu, and no "Undo" — the toggle itself is the correction. This is a
  deliberate simplification for the dense, many-rows-per-page season
  list, not an oversight — don't "fix" episode tracking to match movie
  tracking's event-preserving model without a real product reason to
  change it back.
- **Per-event removal must be able to tell same-day events apart.** The
  movie history menu (`MovieTrackingControl`) lists past events as
  "Remove {date}"; because more than one viewing can land on the same
  calendar day, those entries use `formatDateTime` (date + time), not
  `formatDate` (date only) — otherwise two same-day rewatches render as
  identical, indistinguishable menu items and a removal could target the
  wrong one by accident.
- **Show personal state and provider status are visually separate.**
  `ShowHero`'s provider status text (e.g. "Ended", "Returning Series")
  and `ShowTrackingControl`'s personal state ("Watching", "On hold", …)
  are different rows in different parts of the page — never merged into
  one label — so a user never has to guess which one they're reading.
- **Season progress is a read-only readout, not a control.** Marking
  episodes drives progress; there's no separate "set progress to N"
  interaction.

## Episode row design

`EpisodeRow` deliberately doesn't build the episode number into the
title string ("4. Title") — the number is its own quiet typographic
column (`aria-hidden`, since it's redundant with the accessible content
around it), letting the title read as a title. `EpisodeWatchControl` is
a "watch ring", not an icon swap: an empty outline ring for unwatched, a
filled ring for watched, `size="sm"` and a thin 1px border — the shape
change carries the state, not a bigger/heavier button chrome. Both are
deliberately never Clay (see CLAUDE.md, "Visual system") — an episode
control fires many times per season, and Clay stays reserved for
genuinely rare moments.

### Next episode emphasis

`EpisodeList` computes the season's own first aired-but-unwatched
episode (`findNextEpisodeNumber`) and `EpisodeRow` renders it with a
quiet rounded Clay-tinted background — a `bg-primary/[0.06]`
(`/[0.1]` in dark mode) fill, not a border line or a "NEXT UP" banner.
This was tuned after a real rendered review: an earlier left-border-
accent version read as a stray colored line rather than a deliberate
highlight, especially next to the list's own `divide-y` row separators;
a soft full-row tint reads as an intentional "you are here" marker
instead. The same signal reaches assistive tech via an explicit
`aria-label` on the episode's own heading (`"{title} — Next episode"`)
rather than relying on the tint alone. Deliberately scoped to the
current season's already-fetched episodes — if the true next episode is
in a different season, the page simply shows no highlight, which is
honest given what's actually on screen.

## What this phase deliberately does not include

No Library, Watchlist, Backlog, Continue Watching, Up Next, or bulk "mark
season/show watched" action exists yet — those are later product phases
built on top of this foundation. (Watch Diary, listed here in an earlier
revision of this document, has since shipped — see `docs/diary.md`.) Show
Details also does
not show per-season progress badges on the Seasons row itself (only the
show-level total): adding that would mean fetching every season's
episodes just to render the row, which conflicts with "Show Details never
eagerly fetches every season's episodes" (see `docs/architecture.md`).
