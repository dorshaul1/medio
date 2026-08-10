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

The page's `?type=`/`?sort=` filters are real URL state (stable,
bookmarkable, back/forward-safe) — pagination position is deliberately
**not**. `DiaryTimeline` (`features/diary/diary-timeline.tsx`) is a
narrow Client Component that holds the currently-loaded entries in local
state, seeded from the server's first page; "Load more" calls
`loadMoreDiaryEntriesAction` (`features/diary/diary-actions.ts`), a thin
Server Action wrapping `getDiaryPage`, and appends the result. This keeps
data fetching/hydration/authorization entirely server-side while still
allowing progressive client append — one of the architectures
`CLAUDE.md`'s Diary rules explicitly sanction. `DiaryTimeline` resyncs to
the server's fresh first page whenever an Edit/Delete action revalidates
the route (see "Edit/Delete UX" below) — this collapses any loaded "Load
more" pages back to page one, which is correct (never stale/duplicate
data) even though it loses scroll depth.

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

`?type=movies|tv` and `?sort=oldest` are real URL state
(`features/diary/diary-params.ts`), same convention as Library's own
`?type=`/`?state=`/`?sort=`. "TV" (not "Episodes") is the filter label —
this application already uses "TV"/"Shows" as its product vocabulary for
episode-driven content elsewhere (Discover's Movies/Shows mode).
Diary deliberately does **not** offer a Watching/Completed/Watchlist-style
state filter — those describe media state, not history event types (see
CLAUDE.md).

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

Diary search, calendar visualization, total-watch statistics/hours
watched/streaks, a taste profile, Year in Review, per-episode/per-movie
ratings or notes, social activity, import/export, or a manual "add a past
viewing by searching for a title" flow (every Diary event still comes
from the same tracking commands Movie/Show/Season Details already use).
