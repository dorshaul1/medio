# Watch Diary

`/library/diary` is the chronological personal-history surface: "what have
I been watching?" — distinct from `/library` ("what's my current state
with each title?"). This document covers the domain model and
architecture; see `docs/tracking.md` for the underlying event tables and
`docs/library.md` for the related, but distinct, personal-media surface.

## The Diary is a projection, not a table

There is no `diary` table and no Diary-specific persistence anywhere.
Every Diary entry is a `MovieWatchEvent` or `EpisodeWatchEvent` row (see
`docs/tracking.md`) presented well. `server/diary/` composes those two
tables with normalized TMDB metadata at read time; nothing here is a
source of truth for anything — the tracking event tables remain the only
source of truth, exactly as before this phase.

## Unified chronology

`server/diary/events.ts`'s `listDiaryEvents` is the one cross-type query —
a single SQL-level `UNION ALL` across `movie_watch_events` and
`episode_watch_events` (the same strategy `server/library/candidates.ts`
already uses to combine independent tables — see docs/library.md,
"Candidate query and pagination"), never a fetch-N-of-each-then-
concatenate-in-application-code approach, which can't paginate correctly
across two independently-ordered sources.

## Cursor pagination

Pagination is real keyset (cursor) pagination, not `OFFSET`. The ordering
tuple is `(watched_at, event_type, id)` — `event_type`/`id` are tie-
breakers for the (rare but real) case of two events sharing the exact
same `watched_at`, so a page boundary is always "the next tuple strictly
past the cursor," never a row count. That stays correct and stable even
if rows are inserted or deleted between page loads, and never drops,
duplicates, or reorders same-`watchedAt` events across pages (see
`server/diary/events.test.ts`).

`DIARY_PAGE_SIZE` (`server/diary/constants.ts`) bounds every query.

### Pagination architecture

The page's `?type=`/`?sort=`/`?month=` are all real URL state (stable,
bookmarkable, back/forward-safe) — pagination position *within* the
requested month is deliberately **not**. `DiaryTimeline`
(`features/diary/diary-timeline.tsx`) is a narrow Client Component that
holds the currently-loaded entries in local state, seeded from the
server's first page; "Load more" calls `loadMoreDiaryEntriesAction`
(`features/diary/diary-actions.ts`), a thin Server Action wrapping
`getDiaryPage`, and appends the result. This keeps data fetching/
hydration/authorization entirely server-side while still allowing
progressive client append — one of the architectures `CLAUDE.md`'s Diary
rules explicitly sanction. `DiaryTimeline` resyncs to the server's fresh
first page whenever an Edit/Delete action revalidates the route (see
"Edit/Delete UX" below) — this collapses any loaded "Load more" pages
back to page one, which is correct (never stale/duplicate data) even
though it loses scroll depth.

## Month-scoped querying

Diary 2.0's default browsing mode is one real calendar month at a time —
`?month=YYYY-MM` (`features/diary/diary-params.ts`'s
`normalizeDiaryPeriod`, falling back to the current month), with
prev/next chevrons, a "Today" return control, and a compact month/year
picker (`DiaryMonthNav` — `features/diary/diary-month-nav.tsx`), styled
after Calendar's own month-view header nav
(`CalendarMonthView`/`app/(app)/calendar/page.tsx`) for one consistent
date-navigation language across the app. `listDiaryEvents`'s optional
`period` filter (`server/diary/events.ts`) bounds the SQL query itself to
that month — the page fetches the requested period directly rather than
paging through everything before it, so a large history stays cheap to
browse regardless of total size. `period` is applied only in the final
`where`, never inside the `movie_events`/`episode_events` CTEs, so it
never affects `ordinal` (still computed over each partition's entire
history — see "Rewatch ordinal" above).

### Month navigation and timezone

A month boundary is interpreted as a **UTC calendar month** at the query
level — `Date.UTC(year, month - 1, 1)` to `Date.UTC(year, month, 1)` —
the same documented simplification `server/stats/timeline.ts`'s
`computeMonthlyActivity` already uses for monthly bucketing, and for the
same reason: a real per-viewer-timezone month boundary can't be computed
server-side without knowing the viewer's timezone, and the resulting slop
(at most a few hours, only ever near a month's first/last day) is an
acceptable, explicitly accepted tradeoff at month granularity — see
CLAUDE.md, "Calendar and analytics month boundaries." `DiaryMonthNav`'s
own "is this the current month"/picker-highlighting logic uses the same
UTC basis, not a post-mount local-timezone reconciliation, since none of
it claims the real-time-of-day precision `groupDiaryEntries`'s per-entry
"Today"/"Yesterday" labels do — those still switch to the browser's real
local day post-mount, exactly as before this phase (see "Date grouping
and timezone correctness" below), completely independent of the coarser
month-scope decision above it.

### Month/year activity

`getDiaryActivityCalendar` (`server/diary/events.ts`, wrapped by
`server/diary/queries.ts`) is one small aggregate query — grouped by real
`(year, month)` buckets that actually have at least one event, bounded by
the number of distinct months the user has ever watched something in,
never by event count. One query result serves three UI needs at once
(see the Diary page, `app/(app)/library/diary/page.tsx`): which years the
picker offers at all (years appear only when real history exists —
`activeYears.length > 1` before showing year chips), which months within
a year get visually distinguished as having real activity, and the
current month's own "N movies · N episodes" overview line
(`formatDiaryMonthSummary` — `features/diary/diary-month-summary.ts`,
which returns `null` for a sparse month rather than rendering "0 movies ·
0 episodes"). A tiny day-by-day activity strip was considered and
deliberately **not** built this phase — the month picker and per-day
group headings already cover month/day navigation; a decorative strip on
top didn't clear "genuinely useful, not built for decoration."

### Empty vs. sparse

Three distinct states, not one generic empty message:

- **No history at all** (`getDiaryActivityCalendar` returns nothing) — a
  brand-new account. Month navigation isn't rendered at all (there's
  nothing to browse), and the empty state offers an Explore CTA.
- **A sparse month** (real history exists elsewhere, but the requested
  month has none) — "Nothing watched in {Month Year}." with no CTA; month
  navigation stays fully visible and operable around it, since the point
  is to keep browsing, not to redirect elsewhere.
- **A filtered-empty month** (the month has real events, just none
  matching the current `?type=` filter) — "Nothing here yet." naming the
  month, distinct copy from the sparse case above.

## Rewatch ordinal

`ordinal` (`server/diary/types.ts`) is an event's 1-based chronological
position among every event for the *same media identity* — a movie's own
provider id, or an episode's own provider id — computed by a SQL window
function (`row_number() over (partition by ... order by watched_at asc,
id asc)`) inside `listDiaryEvents`, **before** the cursor/limit are
applied. This means:

- it reflects the user's entire history for that title/episode, never
  just what happens to be on the current page;
- it stays correct after paging (tested explicitly —
  `events.test.ts`, "ordinal is correct on a later page");
- it stays correct after a backdated edit moves an event earlier/later in
  its own partition (tested explicitly);
- it costs one query, not one per entry — no N+1.

UI shows nothing for ordinal 1 (a first viewing isn't a "rewatch"), and a
plain-English ordinal label ("2nd watch", "3rd watch", ...) from ordinal 2
onward (`features/diary/diary-ordinal.ts`) — never a bright badge, always
small/secondary text next to the entry's date context.

## Date grouping and timezone correctness

`watched_at` is a real `timestamptz`; which *calendar day* it displays
under is a presentation concern, and the only correct basis for that is
the viewer's real local timezone — a display concern the database has no
way to know. `features/diary/diary-date-grouping.ts`'s `groupDiaryEntries`
is a pure function, called from `DiaryTimeline` (a Client Component):

- **Before mount**, it groups using UTC date parts (`useLocalTimezone:
  false`) — a value that's provably identical whether it runs on the
  server (the SSR pass) or the client's very first render, so there is
  nothing to reconcile at hydration time and no mismatch warning.
- **After mount** (one `useEffect`, flips a `mounted` flag), it re-groups
  using the browser's real local date parts — the only correct answer —
  and "Today"/"Yesterday" become meaningful for the first time (they're
  never shown pre-mount, since claiming "Today" without knowing the real
  local timezone would just be a guess).

Older entries get a concise localized date (`"August 5"`, or `"August 5,
2022"` once the year differs from the current one) — never a fuzzy label
like "a while ago". Time-of-day is not shown in the row itself (kept
deliberately calm/dense); it's available as a `title` tooltip
(`formatDateTime`) for anyone who wants precision.

## Movie vs. Episode entries

`DiaryEntry` (`server/diary/types.ts`) is a discriminated union —
`MovieDiaryEntry` / `EpisodeDiaryEntry` / `UnavailableDiaryEntry` — never
one prop-optional type. `DiaryMovieEntry` and `DiaryEpisodeEntry`
(`features/diary/`) are deliberately different compositions, matching the
same "context-specific presentation" principle every other media surface
in this app already follows:

- **Movie**: compact poster (`aspect-2/3`), title, year, rewatch context.
  No overview/genres/rating/runtime — the user is reviewing history, not
  rediscovering the movie.
- **Episode**: the episode's own still (`aspect-video`, same fallback
  treatment as `EpisodeRow` on the Season page), show title as quiet
  secondary text, `S{n} E{n} · Episode Title` as the primary line,
  rewatch context. Diary only ever shows episodes the user has already
  watched, so surfacing the still/title here is never a spoiler (compare
  Home's Up Next, which deliberately withholds the next *unwatched*
  episode's identity — see docs/home.md).

## Viewing session grouping

Two or more Episode entries of the **same show**, on the **same day**
(after date grouping above has already decided which day), watched no
more than `DIARY_SESSION_MAX_GAP_MINUTES` (`server/diary/constants.ts`,
currently 180) apart, collapse into one binge session row instead of N
separate rows — `groupDiarySessions`
(`features/diary/diary-session-grouping.ts`), a pure function run per
date group, never across days. Deliberately conservative:

- A movie, an `UnavailableDiaryEntry`, a different show, or too large a
  gap all end the current session immediately — nothing is ever guessed
  past. A "session" of exactly one qualifying episode collapses back to a
  plain single row; grouping only matters once there's genuinely more
  than one episode to compress.
- Presentation-only — a session never reorders, merges, or drops the
  underlying `EpisodeWatchEvent`s. Expanding one (`DiaryEpisodeSession` —
  `features/diary/diary-episode-session.tsx`) reveals the exact same
  `DiaryEpisodeEntry` rows a non-grouped day would render, each with its
  own real link and its own independent Edit/Delete menu — a rewatch
  mixed into a session keeps its own ordinal label untouched.
- Displayed chronologically (oldest episode first) within the session
  regardless of the page's own overall sort direction — a binge reads as
  a narrative ("E4, then E5, then E6"), independent of newest/oldest sort.
- The collapsed row's summary label (`sessionEpisodeLabel`) is
  `"S{n} E{a}-E{b}"` for a same-season contiguous ascending run,
  `"S{n} E{a}, E{c}, ..."` for a same-season non-contiguous run, or a
  plain episode count once a session spans more than one season — never a
  guessed range that isn't really there.
- **Session interaction boundaries**: the whole collapsed row is a
  disclosure toggle (`aria-expanded`), never a navigation link — there's
  no one canonical episode a session-level click could mean. Navigating
  to a specific episode's Show/Season context only ever happens from an
  *expanded* individual row's own real link, keeping identity-click and
  correction-menu boundaries exactly as unambiguous as a non-grouped day
  (see CLAUDE.md, "UX & Interaction").
- Especially valuable on mobile, where repeating full-size episode rows
  for a long binge would otherwise dominate the screen — collapsed by
  default everywhere, not just below a breakpoint.

A **Rewatches-only filter** was considered and deliberately **not**
added this phase — rewatch context is already visible inline via the
ordinal label on every entry/session, and Diary intentionally stays
light on filtering (see "Filtering and sorting" below); a dedicated
filter didn't clear the "sufficient actual value" bar the original phase
scope set for it.

## Provider hydration

`server/diary/hydrate.ts`'s `hydrateDiaryEvents` is the one place Diary
composes tracking identity with TMDB data — bounded to the current page,
deduplicated, and parallelized:

- every distinct movie on the page → one `getMovieDetails` call;
- every distinct show on the page → one `getShowDetails` call;
- every distinct **show+season pair** → one `getSeasonDetails` call,
  reused to resolve every visible episode entry in that season (matched
  by the episode's own canonical provider id, never guessed from episode
  number). Five Diary events from the same season cost one Season fetch,
  never five.

TMDB's own `next: { revalidate }` fetch caching (`server/tmdb/queries.ts`)
still applies underneath this; this layer's deduplication is about never
issuing the *redundant* requests in the first place, not a replacement
for that cache.

### Provider failure

If hydration fails for one event (a live TMDB error, or the title having
since become unavailable), that event becomes an `UnavailableDiaryEntry`
— the real event identity/history/ordinal is preserved and rendered (a
restrained "Title unavailable" row, still linking to the real
movie/episode route, still offering Edit/Delete), but no title is ever
fabricated for it. One failure never breaks the rest of the page and
never touches the underlying watch event — the same graceful-degradation
contract `server/library/compose.ts` already applies to Library rows.

## Edit/Delete UX

`DiaryEntryMenu` (`features/diary/diary-entry-menu.tsx`) is one shared
contextual menu — Edit watch date / Delete — used by every entry shape
(an unavailable entry still has real identity, so it still gets the same
menu). It dispatches to a `DiaryMutationTarget` (`{ eventType: "movie" |
"episode", ... }`), never the full `DiaryEntry` union — the "safe
discriminated identifier" CLAUDE.md's Diary rules call for.

**No parallel mutation path.** Edit calls
`updateMovieWatchedAtAction`/`updateEpisodeWatchedAtAction` and Delete
calls `removeMovieWatchEventAction`/`removeEpisodeWatchEventAction` — the
exact same Server Actions `MovieTrackingControl`/`EpisodeWatchControl`
already call, living beside them in `features/movies/
movie-tracking-actions.ts` / `features/shows/show-tracking-actions.ts`,
not duplicated into a Diary-specific action file.

- **Edit** only ever changes `watchedAt` — there is no way to pass a
  different movie/show/season/episode through these functions, so an
  edit can never turn one title's viewing into another's (enforced at
  the domain layer — `updateMovieWatchedAt`/`updateEpisodeWatchedAt` in
  `server/tracking/`, ownership-scoped the same way every other tracking
  mutation is). Only the calendar date changes; the original local time
  of day is preserved (`getHours/getMinutes/getSeconds` carried over),
  never reset to midnight/noon — a correction never silently invents a
  time nobody entered.
- **Delete** targets exactly one event by id (reusing
  `removeMovieWatchEvent`/`removeEpisodeWatchEvent`, both already
  ownership-scoped) — never every event for that media. Deleting one
  rewatch leaves every other viewing untouched. A confirmation Dialog is
  required first (the same `Dialog`-triggered-from-a-`DropdownMenuItem`
  pattern `ShowTrackingControl`'s "Reset progress" already established) —
  real history deletion is the one destructive action in this menu.

Both mutations `revalidatePath("/library/diary")` in addition to their
existing paths (Movie/Show/Season Details, Library, Home) — see
docs/tracking.md for the full revalidation list. Downstream derived state
(Show progress, Library rows, Home's Up Next/Continue Watching/Finish
Soon) recomputes naturally from the now-corrected event rows; nothing is
a stale persisted copy that needs separate updating.

## Filtering and sorting

`?type=movies|tv`, `?sort=oldest`, and `?month=YYYY-MM` are all real URL
state (`features/diary/diary-params.ts`), same convention as Library's
own `?type=`/`?state=`/`?sort=`. "TV" (not "Episodes") is the filter
label — this application already uses "TV"/"Shows" as its product
vocabulary for episode-driven content elsewhere (Discover's Movies/Shows
mode). Switching the type filter or sort always carries the currently
viewed `?month=` forward (`DiaryFilterToggle`/the page's own sort
options) — it never silently jumps back to the current month. Diary
deliberately does **not** offer a Watching/Completed/Watchlist-style
state filter (those describe media state, not history event types) or a
free-text search (Library already covers title lookup) — see CLAUDE.md.

## Privacy / caching

`getDiaryPage` (`server/diary/queries.ts`) reads `requireSession()` and is
therefore inherently per-request/dynamic — never statically generated,
never eligible for shared/public caching, same rule as Library and Home.
TMDB's own responses used to hydrate a page may still use Next's normal
public fetch caching; that stays a separate, provider-owned concern from
the private Diary composition wrapping it. `loadMoreDiaryEntriesAction`
derives the acting user from the session itself, exactly like every read
in this application — a caller can never request another user's page by
guessing a cursor.

## Library vs. Diary

Both live under the Library product area (`/library`, `/library/diary`)
and share the small `LibrarySectionNav` breadcrumb-style switcher
(`features/library/library-section-nav.tsx`) — deliberately not a second
row of underline tabs, since each page already has its own content-filter
tabs and stacking two identically-styled tab rows would read as one
confusing double tab bar. Library is answers "what's my current
relationship with this title" (state-oriented); Diary answers "what did I
actually watch and when" (temporal). Diary being nested under `/library`
in the URL doesn't change primary navigation: `isNavItemActive`
(`src/config/navigation.ts`) already treats any route nested under a
primary destination's own path as still that destination, so Library
stays the active left-rail/bottom-bar item while on `/library/diary`.

## What this phase deliberately does not include

Diary search, a day-by-day calendar-grid visualization (the month/year
picker and per-day group headings already cover date navigation — see
"Month/year activity" above), a Rewatches-only filter (see "Viewing
session grouping" above), total-watch statistics/hours watched/streaks, a
taste profile, Year in Review, per-episode/per-movie ratings or notes,
social activity, notifications, comments, friends, a public Diary,
manual text journal entries, calendar sync, import/export, or a manual
"add a past viewing by searching for a title" flow (every Diary event
still comes from the same tracking commands Movie/Show/Season Details
already use).
