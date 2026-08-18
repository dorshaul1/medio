# Library

`/library` is the personal-media surface: "what am I watching, planning,
pausing, or finished with?" — distinct from Discover ("what could I
watch?"). This document covers the domain model behind it; see
`docs/tracking.md` for the tracking domain it composes with.

## Library is a read model, not one database table

There is no `library` table. A Library item exists because it is one of:

- a **planning entry** (Watchlist/Backlog — `media_planning_items`)
- a **watched movie** (derived from `movie_watch_events`)
- a **tracked show** (an explicit `show_tracking_state` row, plus a
  derived viewing state — see `docs/tracking.md`)

`server/library/` composes these with normalized TMDB metadata into
`LibraryItem` view models (`server/library/types.ts`) at read time. No
database table is ever named "library", and no derived status is ever
persisted just to make this composition cheaper — see "Provider fan-out"
below for how it stays cheap without that.

## Watchlist vs. Backlog

Both are **planning intents** — what the user intends to watch, never a
tracking status:

- **Watchlist**: lightweight, "I'm interested, save this for later."
- **Backlog**: stronger, "I actively intend to get to this."

Persisted in `media_planning_items` (`src/server/db/schema/planning.ts`):
one row per user+media, composite primary key on
`(user, media_type, media_provider_id)` — a user has at most one current
planning entry per piece of media, and moving Watchlist → Backlog updates
that same row (`changePlanningIntent`), never creates a second one. The
row carries only external identity + intent — no title, poster, or other
provider metadata (see docs/media-provider.md); that's composed from TMDB
at read time, same as everywhere else in this app.

## Planning clears when tracking starts

The one integration point between Planning and Tracking: when a user
actually starts consuming planned media, its planning entry clears
automatically, in the same transaction as the tracking write —

- recording a movie's first watch event (`recordMovieWatch`)
- explicitly starting a show (`startWatchingShow`, and by extension
  `putShowOnHold`/`dropShow` — any explicit tracking state means the show
  is no longer "just planned")
- recording a show's first episode watch (`recordEpisodeWatch`)

all call `server/planning/planning-items.ts`'s `clearPlanningItem` (a
no-op if no planning entry exists) inside their own transaction. This is
the one place `server/tracking/` depends on `server/planning/` — a
narrow, deliberate, one-directional integration, not a merged domain.
Removing a planning entry (or clearing tracking state) never runs in the
other direction — see "History is never deleted" below.

## History is never deleted

Removing a Watchlist/Backlog entry never touches `MovieWatchEvent`s,
`EpisodeWatchEvent`s, or `ShowTrackingState`. Clearing a show's tracking
state never creates a planning entry. Planning and Tracking read/write
independently; the only connection is the one-directional "clear planning
when tracking starts" rule above.

## Movie Library states

A movie appears in Library as: **Watchlist**, **Backlog**, or **Watched**
(derived from `MovieWatchEvent` count > 0 — no persisted "watched"
status). A watched movie's Library row shows watch count / last watched,
using natural "Watched" language, not an invented status.

## Show Library states

A show appears as: **Watchlist**, **Backlog**, or a tracked show showing
one of **Watching / Caught up / Waiting / On hold / Dropped / Completed**.
`Watching`/`On hold`/`Dropped` are explicit (`ShowTrackingState`);
`Caught up`/`Waiting`/`Completed` are derived at read time from watch
history + provider status — see `docs/tracking.md`. None of the derived
values are ever persisted for Library's benefit.

## Provider metadata composition

`server/library/candidates.ts` reads only identity + personal state from
Postgres (planning rows, movie-watch aggregates, show-tracking rows) — no
title, poster, or other TMDB fields live there. `server/library/compose.ts`
hydrates the current page's candidates with real `getMovieDetails`/
`getShowDetails` calls (parallelized, bounded by page size) and produces
`LibraryItem`s. Raw TMDB DTOs and raw DB rows never reach UI code — only
`LibraryItem`.

If a title's provider hydration fails (a live TMDB error, or the title
becoming unavailable), that one item is simply omitted from the page — it
never crashes the whole Library, and the user's underlying planning/
tracking row is never touched or deleted just because hydration failed
once (there is nothing safe to display for it, since title/artwork are
deliberately never mirrored into Postgres).

## Candidate query and pagination

`listLibraryCandidates` (`server/library/candidates.ts`) is one paginated,
SQL-level `UNION ALL` across the three source tables, ordered and limited
in Postgres — never a fetch of the user's entire personal history sliced
in application code. It fetches one row past the requested page size to
compute `hasMore` without a separate `COUNT` query. Library's "Load more"
grows a `?count=` URL param in fixed page-size increments (see
`features/library/library-params.ts`), so pagination stays a plain,
bookmarkable value rather than client state — each request is still one
bounded query, never the full history.

The `UNION ALL` itself lives in one shared `candidatesCte` helper, reused
by both `listLibraryCandidates` (a normal filtered/sorted page) and
`listLibrarySearchCandidates` (search's own bounded recency scan — see
"Search" below) — so there is exactly one definition of "what counts as a
Library candidate," never two that could quietly drift apart.

## Default grouping

The default Library view (no explicit `?state=`, no active search)
doesn't render items in raw chronological order — a Dropped show from
last year sorting ahead of a show the user is actively watching (purely
because SQL-level "recently active" ordering has no idea one is more
*important* than the other) is exactly the "inactive states dominate"
failure this avoids.

`groupLibraryItems` (`server/library/types.ts`) clusters an already-
fetched, already-recency-ordered page into a small, fixed hierarchy —
**In progress → Planned → Paused → Finished** (`LibraryStateGroup`,
computed per item by the existing `libraryStateGroup`) — stable within
each group, omitting any group with no items on this page. This is pure
display reordering, not a second query: it never changes *which* items
are on the page, only how *this page's* items are clustered, so "Load
more" (which re-fetches the whole accumulated `count` each time, per
"Candidate query and pagination" above) stays consistent.

This is a deliberate, honest approximation, not a promise of a fully
priority-ordered page: because a Show's true group depends on its
*derived* state (Caught up/Waiting/Completed), which requires provider
hydration, grouping can only reorder items the recency-bounded SQL query
already decided to fetch — a Watching show that hasn't been touched in
months, evicted from the fetched page by a more recently active
Watchlist save, won't be pulled back in just because it would outrank
that save in the hierarchy. In practice this rarely matters (an actively
watched show is usually also recently active); the alternative (resolving
every candidate's derived state up front to sort correctly) is exactly
the unbounded provider fan-out "Show derived state at Library scale"
below forbids.

Grouping is skipped entirely once a specific `state` is chosen, or a
search is active — every visible item already shares that one state (or
matches the query), so a second grouping pass would just repeat one
redundant heading.

## Search

Library search (`server/library/search.ts`) searches only this user's own
Library — never the global TMDB catalog (that's Discover's job) — and
composes with the existing type/state filters rather than replacing them.

Title lives in TMDB, never in Postgres (see "Provider metadata
composition" below), so a text query can only be checked *after*
hydrating candidates' titles. To keep this fast and bounded:

1. `listLibrarySearchCandidates` fetches the user's most-recently-active
   `LIBRARY_SEARCH_CANDIDATE_CAP` (400) candidates matching the active
   type/state filters — identity only, no title, one cheap indexed query.
2. Each candidate's title (+ original title) is hydrated in parallel,
   bounded to that same cap — never per keystroke: the client-side
   `LibrarySearch` input debounces before it ever touches the URL's
   `?q=`, and each committed query is one bounded server request, not a
   fetch loop tied to typing.
3. Matches are ranked with title-starts-with above title-contains, both
   groups keeping the scan's own recency order — then sliced to the
   requested page size and composed into real `LibraryItem`s via the
   normal `composeLibraryItems`.

The cap is an accepted, honestly-documented scale limit, not a silent
correctness bug: a title outside the user's most-recently-active 400
candidates (a very old, long-untouched save in a huge Library) won't
surface. `LibrarySearchPage.scanWasCapped` lets the Library page note this
rather than silently implying it searched everything.

A search with no matches offers an explicit, opt-in path to global
Search (`LibrarySearchEmptyState`, "Search MEDIO for "…"" linking to
`/discover?q=...`) — scope is never silently widened to the TMDB catalog.

## Show derived state at Library scale — an approximation

Show Details computes exact progress from real per-episode air dates (one
bounded fetch per season, only for the one show being viewed — see
`docs/tracking.md`). Doing that for every show visible on a Library page
would mean an N×season provider fetch explosion, which this application's
architecture forbids (see `docs/architecture.md`).

`server/library/approximate-progress.ts`'s `approximateAiredEpisodeCount`
instead counts a season's full episode count once that season's own air
date has passed, using only the one `ShowDetails` fetch already needed for
the row's title/poster — no extra per-season fetches. The one accepted
imprecision: a season that started airing but isn't finished yet counts as
fully aired a few episodes early. That's acceptable for Library-scale
*state classification* (Watching vs. Caught up vs. Completed); it is never
presented as Show Details' precise progress number, and Show Details
itself is unaffected by this approximation.

## Quick tracking

Opening Show Details just to mark the next episode watched, or Movie
Details just to mark a planned movie watched, is real friction for the
single most common thing a user does with an active item — see
`docs/architecture.md`'s "Home vs Discover"-style reasoning applied here:
Library is where personal state lives, so its most common transitions
should be reachable without leaving it.

`TrackedShowLibraryItem.nextEpisode` (`server/library/types.ts`) carries
the exact next unwatched aired episode — but only when `derivedState` is
`watching` or `on_hold`; every other state has nothing to resume, so the
extra per-show fetch this needs is never spent computing it for a
Caught up/Waiting/Completed/Dropped/never-started row. It's computed via
the same shared `getShowEpisodeProgress` (see `docs/architecture.md`,
`server/shows/`) Show Details and Home already use — the one accepted
exception to Library's own "no N×season fetch" rule above, deliberately
narrowed to just the small subset of rows that could plausibly use it,
the same bound Home applies to its own active-show candidates.

`LibraryShowQuickAction` renders the same watch-ring "mark watched" icon
control episode rows use (`watching` + a known next episode, see
`features/shows/episode-watch-control.tsx`) or a text "Resume" button
(`on_hold`) using the exact same
`markEpisodeWatchedAction`/`startWatchingShowAction` Show Details itself
calls — no parallel mutation path. `LibraryMovieQuickAction` renders the
same watch-ring control for a planned movie via the shared
`markMovieWatchedAction`. All three revalidate `/library` in addition to
their usual paths, so Library's own quick actions are visible immediately
without a hard reload — see each action's own comment in
`features/shows/show-tracking-actions.ts` /
`features/movies/movie-tracking-actions.ts`.

## Mobile episode controls

Mobile Library's version of the "Quick tracking" control above (see
CLAUDE.md, "Mobile"). `user_preferences.mobileEpisodeControls` (`swipe` |
`checkbox` | `swipe_checkbox`, default `swipe`) decides how — never
*whether* — an eligible tracked show's next episode gets marked watched
on mobile; every option calls the exact same
`markEpisodeWatchedAction`/`useMarkNextEpisodeWatched`
(`features/library/use-mark-next-episode-watched.ts`) desktop's
persistent `LibraryShowQuickAction` button already calls. Desktop is
unaffected regardless of this preference — it always shows the button.

- **Swipe** (default) — the row itself is the affordance; the checkbox
  button is visually hidden (`sr-only`, on a dedicated wrapper `<span>` —
  never merged directly onto the button, which already carries its own
  conflicting `size-*` utility class) but stays real and focusable for
  keyboard/screen-reader users (see "Gesture accessibility" below).
- **Checkbox** — the persistent icon control, same as desktop, swipe
  gesture disabled entirely.
- **Both** — both are active at once.

### Swipe to watch

`EpisodeSwipeRow` (`features/library/episode-swipe-row.tsx`) wraps the
row's translatable identity content (poster/title/detail — never the
whole `<li>`, so the shell's own flex layout stays intact) and reveals a
primary-color "mark watched" layer underneath as the user drags right —
"swipe right to check off" (the same direction Reminders/Things-style
task apps use for a positive completion action), not the "swipe left to
reveal more actions" direction Mail-style apps use for secondary/
destructive actions. Pure gesture math (`swipe-math.ts`) is unit-tested
independently of any DOM/pointer wiring:

- **Direction lock** (`resolveSwipeIntent`) — nothing moves until real
  movement clearly resolves horizontal vs. vertical (a dead zone plus a
  dominance ratio), so an ordinary vertical scroll never drags a row.
  Once resolved vertical, this component releases its own claim on that
  pointer permanently for the gesture — the browser's native scroll
  (never prevented) has it from there.
- **Rightward-only** (`clampSwipeTravel`) — a leftward drag never moves
  the row. A real row starts well clear of the true screen edge (page
  padding, the poster's own margin), so this doesn't compete in practice
  with the browser's own edge-swipe-back gesture, which only activates
  from a touch starting within a narrow strip of the actual viewport
  edge.
- **Threshold** (`isPastCommitThreshold`, 60% of the reveal layer's own
  travel) — short of it, both layers animate back to rest and nothing
  changes; past it, the row holds the full reveal and calls the
  canonical mutation. A failed mutation restores the row (never a false
  "watched" state) without touching the list's scroll position.
- Repeated submission is impossible mid-mutation — the surface stops
  responding to new gestures while `isPending`.

### Gesture accessibility

Even in Swipe mode, the real accessible control (the same `IconButton`
`LibraryShowQuickAction` renders on desktop) is always present and
focusable — a pointer gesture is never the only way to reach a domain
action. Its visual presentation (visible vs. `sr-only`) is the only thing
`mobileEpisodeControls` changes.

### Swipe discoverability

A one-time, brief reveal-and-settle (well short of the commit threshold
— it can never be mistaken for a real action) plays on the first eligible
row a user's mobile Library ever renders, then never again —
`user_preferences.hasSeenSwipeHint` persists that it's played.
`SwipeHintProvider`/`useClaimSwipeHint`
(`features/library/swipe-hint-context.tsx`) ensures at most one row per
page load ever claims it, even across multiple swipeable rows or a "Load
more" page. Separately, every swipeable row also carries a small,
permanent (never repeating/animating on its own), quiet chevron cue —
not a tutorial banner, just a constant "this row responds to a swipe"
signal that fades out as a real drag takes over.

## Why derived states aren't a pre-filter

Library's URL `state` filter (`LibraryRawState`) only ever exposes states
that are genuinely stored: Watchlist, Backlog, Watching, On hold, Dropped,
Watched. Caught up / Waiting / Completed are **not** filterable via the
URL, because knowing which shows currently qualify would require resolving
every tracked show's derived state up front — the same unbounded-fetch
problem the section above describes, just moved from render-time to
filter-time. Filtering by "Watching" already surfaces every actively-
engaged show regardless of its precise derived sub-state; the exact
derived label is still visible on each row once rendered. The same
reasoning is why Library doesn't offer a "sort by title" option either —
title lives in the provider layer, not Postgres, so a true sort would
require fetching every candidate's title up front.

## Deduplication

The planning/tracking transition rules should already prevent a title
appearing from two sources at once (planning clears the moment tracking
starts). `compose.ts` deduplicates defensively anyway, by
`(mediaType, mediaProviderId)`, before hydrating — Library composition
doesn't rely on the transition invariant alone to avoid showing the same
title twice.

## Privacy / caching

`/library` reads `requireSession()` and is therefore inherently
per-request/per-user — never statically generated, never a candidate for
shared/public caching. TMDB's own responses (used to hydrate a page of
candidates) may still use Next's normal fetch caching; that's public,
provider-owned data, and stays a separate concern from the private
Library composition wrapping it.

## Future Home reuse boundary

`getLibraryPage` (`server/library/queries.ts`) is the one reusable
application-level read — parameterized by media type, state, sort, and
count. A future personalized Home section (e.g. "Continue Watching")
should call this same function with different parameters (e.g.
`state: "watching", sort: "recently_active", count: 6`), not duplicate
Library's candidate/compose logic or query the database directly. No
Home-specific rendering model exists yet — that's intentionally deferred
until Home personalization is an actual phase.

## What this phase deliberately does not include

Collections, custom lists, tags, richer planning intents (Soon/Someday/
Weekend/With someone), Library-based recommendations, streaming-provider
availability, notifications, or general bulk management (see CLAUDE.md,
"Explicitly Out Of Scope" in the Library 2.0 phase). Comments and
import/export already exist as their own domains (`docs/opinions.md`,
`docs/data-portability.md`) and Library search exists (see "Search"
above) — none of those are missing, just not Library-specific inventions.
Per-season progress badges on Library's tracked-show rows use the
Library-scale approximation above, not Show Details' exact progress —
see "Show derived state at Library scale."
