# Search & Discover

Two related, deliberately distinct jobs (see CLAUDE.md, "Media UI"):

- **Search** answers *"I roughly know what I'm looking for."* Fast,
  precise, and — as of this phase — unified across Movies, Shows, and
  People in one ranked result, reachable from anywhere in the app
  (`⌘K`/`Ctrl+K`) as well as from Discover's own page.
- **Discover** answers *"show me something worth exploring."* Curated
  browsing (genres, a small editorial moment), not a decision engine —
  see `docs/recommendations.md` for how Pick for Me is a third, distinct
  thing again ("decide for me now").

## Unified search ranking

`server/search/rank.ts` — pure, no I/O. Movies, Shows, and People are
ranked in **one pass**, never three separate type-grouped lists and never
a fixed per-type quota. Type is communicated to the user through a small
icon + word (`ResultTypeTag`), not through list position — there is no
hidden "Movie > Show > Person" priority anywhere in the scoring.

The score for a candidate is `textMatch + popularity + recency +
personalState`:

- **`textMatch`** — a discrete tier, the dominant signal: `exact` (1) >
  `prefix` (0.75) > `wordBoundary` (0.55) > `substring` (0.3) > no match
  (dropped from the results entirely — a candidate with zero textual
  relevance to the query is excluded, not ranked last). Computed against
  every name a candidate could reasonably be typed as (a movie/show's
  title *and* original title; a person's name) via `matchQuality`.
- **`popularity`** — `log10(popularitySignal + 1) / 5`, weighted `0.12`.
  A movie/show's signal is its TMDB `vote_count` (already present on
  search results, and already this codebase's own precedent for "a raw
  provider number used only for ranking, never rendered" — see the
  Person "Known For" selection in `docs/media-provider.md`); a person's
  is TMDB's own `popularity` field. An ambiguity resolver — see "Critical
  example" below — never the primary signal.
- **`recency`** — a small decaying boost for recent media, weighted
  `0.04`. Not a newest-first sort; irrelevant for People (no release
  year).
- **`personalState`** — `0.03` if the user already has *any* relationship
  with a Movie/Show candidate (Watchlist/Backlog/Watched/Watching/...).
  Irrelevant for People.

**Why popularity/recency/personal state can never rescue a weak textual
match**: `SEARCH_RANK_WEIGHTS`' three values sum to `0.19`, strictly less
than the smallest gap between any two adjacent `MATCH_QUALITY` tiers
(`0.2`, between `wordBoundary` and `prefix`). This is a structural
guarantee enforced by the numbers themselves, not a convention someone
has to remember — see `rank.test.ts`, "secondary signals never cross a
match-quality tier".

**Critical example** (from the product spec): searching `Dark` against a
very popular *Dark* (Show), an obscure *Dark* (Movie), *Dark Waters*, and
*The Dark Knight* — the two exact matches rank highest as a pair; between
them, the more popular one goes first. *Dark Waters* (a prefix match)
ranks next; *The Dark Knight* (a word-boundary match, "dark" appears as a
whole word) ranks last. Media type plays no role in this ordering at any
point.

**Text normalization** (`normalizeSearchText`) folds case, whitespace,
punctuation, apostrophes, and basic Latin diacritics (`café` → `cafe`) —
deliberately Unicode-aware (`\p{L}`/`\p{N}`, not `[a-z0-9]`) so non-Latin
scripts normalize to themselves, not to an empty string. `\b` word-
boundary matching (the `wordBoundary` tier) is ASCII-`\w`-based, a known
accepted limitation for that one tier specifically with non-Latin text —
the other tiers don't depend on it.

## Candidate collection

`server/search/compose.ts`'s `searchAll(query, limit, typeFilter)`:

1. Calls `searchMovies`/`searchShows`/`searchPeople` (`server/tmdb/
   queries.ts`) in parallel via `Promise.allSettled` — one type's
   provider failure never hides the others; `failedTypes` reports which
   ones, independently.
2. Caps each type's raw candidate pool at `SEARCH_CANDIDATES_PER_TYPE`
   (20 — TMDB's own first results page) before ranking, so a genuinely
   relevant result rarely gets excluded just because it wasn't in the
   first handful of provider-returned items.
3. Batches personal state for every Movie/Show candidate in that capped
   pool in one call (see "Personal state on public surfaces" below) —
   never a query per candidate, and never for People (no personal state
   exists for a person).
4. Ranks the combined candidate set once (`rankSearchResults`), then
   slices to `limit`.

An optional `typeFilter` (`"all" | "movies" | "shows" | "people"`) skips
the other providers' requests entirely when set — "All" is always the
default architecture; the filter narrows an already-coherent ranking, it
is never how search starts.

## Personal state on public surfaces

`server/media/personal-state.ts`'s `getPersonalStates(items)` — the one
shared, batched "does the user already have a relationship with this
title" projection Search results, GlobalSearch's suggestions, Discover's
genre rows/pages, and Discover's editorial collections all call. Three
small, independently-indexed queries in parallel (planning intent, movie
watch history, show tracking status) — never one query per visible item.

`MediaPersonalState` is a flat discriminated union (`none` / `watchlist`
/ `backlog` / `watched` / `watching` / `on_hold` / `dropped`),
not several optional booleans — Planning and Tracking are already
mutually exclusive per title (see `docs/library.md`), so at most one of
these is ever true. Deliberately lives in `server/media/types.ts` (no
`server-only` sentinel), not alongside the function that computes it —
UI code needs to import the type; only the query itself needs the
`server-only` guard.

A show's *derived* state (Caught up/Waiting/Completed) is never computed
here — that requires per-show provider hydration, exactly the N×season
fan-out `docs/library.md` ("Show derived state at Library scale")
forbids for an unbounded public result set. A show's personal state here
is only ever its **explicit** tracking status.

This is deliberately a separate, leaner projection from Library's own
`server/library/compose.ts` — Library composes from the user's *own*
candidate rows (a query the user already scoped to "what's mine");
Search/Discover compose personal state for an *arbitrary* public result
set. Forcing one to serve both would be exactly the kind of shared
abstraction CLAUDE.md warns against building before there's a real need.

## Command Center (⌘K)

`features/search/global-search-dialog.tsx` (the dialog/overlay shell,
still owned by `features/search/` — trigger, provider, recent-searches,
and the media-search plumbing all predate this phase and stayed put) plus
`features/command-center/` (everything command-specific: types, the
static command catalog, matching, and the Quick Action commands) —
evolved in place from the original Search-only overlay into MEDIO's
canonical desktop Command Center: one keyboard-first surface for
searching Movies/Shows/People, navigating anywhere in the app, and
running the highest-frequency tracking actions. Reachable from anywhere
in the authenticated app (`GlobalSearchProvider`, mounted once in
`AppShell`), triggered by `⌘K`/`Ctrl+K` (desktop) or a Search icon in the
mobile header strip (`GlobalSearchIconTrigger`) / the desktop nav rail
(`GlobalSearchNavTrigger`) — the sidebar Search entry point and `⌘K` open
the exact same dialog, never two implementations.

### Commands

A `Command` (`features/command-center/types.ts`) is either a navigation
(`href: Route`) or a real action (`run: (context: CommandRunContext) =>
void | Promise<void>`) — never both. `CommandGroup` is `"quick-actions" |
"navigate" | "settings"`. The static catalog
(`features/command-center/static-commands.ts`) covers every primary nav
destination plus the deeper Settings categories and Stats' Taste tab,
each with `keywords` for aliases a user might reasonably type that
aren't in the label ("taste" → Stats → Taste, "preferences" → Settings,
"user"/"sign out"/"password" → Account, "releases"/"upcoming" →
Calendar). Two commands are dynamic, composed at render time rather than
static: **Log watched** (`LOG_WATCHED_COMMAND`, always present — opens a
nested in-dialog search step scoped to Movies/Shows, see "Log watched"
below) and **Up Next**'s mark-watched command
(`up-next-command.ts`'s `buildUpNextCommand`, present only when the
user actually has an Up Next episode — fetched once per dialog open via
`getUpNextCommandDataAction`, a thin Server Action wrapper around the
same `getPersonalHome()` Home itself calls; never a second derivation).
Every action command reuses the exact canonical mutation Home/Library/
Show Details already call (`markEpisodeWatchedAction`,
`markMovieWatchedAction`) — commands are a faster entry point into
existing domain behavior, never a parallel implementation of it.

### Ranking

`features/command-center/match.ts`'s `matchCommands(commands, query)`
scores each command by the *same* tiered `matchQuality` unified Search
uses (`normalizeSearchText` + exact/prefix/wordBoundary/substring),
taking the best score across the label and every keyword; a command with
zero textual relevance is excluded, never ranked last. In the combined
result list, a **strong** command match (score ≥ `0.75` — an exact or
prefix hit) is treated as almost certainly what the user meant and leads
the list, ahead of media results; a **weak** match (word-boundary/
substring) trails the media results instead, so a coincidental partial
command match can never push down a clear content search like "breaking
bad". Command and media ranking otherwise stay independent passes —
commands are never blended into `rankSearchResults`' own scoring.

### Log watched

Typing "watch " or "log " before a query (`stripMediaIntentPrefix`) is
the one deliberate bit of intent-parsing this domain does — it's
stripped before the string reaches media search, so "log dune" searches
"dune". Selecting **Log watched** (or matching that intent strongly
enough) switches the dialog into a nested `mode: "log-watched"` step:
the same debounced media search, filtered to Movies/Shows, each result a
`LogWatchedResultRow` that records a real watch event directly
(`markMovieWatchedAction`/navigates to the show to pick an episode) —
never a separate lookup UI. Escape returns to the top-level search first
(via Radix's `onEscapeKeyDown` on `DialogPrimitive.Content` — the
documented hook for intercepting Escape before Radix's own
close-on-Escape fires; a plain child `preventDefault` cannot out-race
it), and only closes the dialog on a second press.

### Default (idle) state

Before typing anything: **Quick actions** (Log watched, Up Next when
available) always render; **Navigate** (every primary destination minus
wherever the user already is, via `isNavItemActive`) is `hidden
md:block` — desktop-only, since mobile already has its own bottom nav
for the same destinations and repeating all of them here would read as
a sitemap dropped into a touch surface, not purpose-built mobile search;
**Recent searches** (last 5, see below) follow. Never a bare "type
something to search" empty state.

### Interaction details (predate this phase, still apply)

- **Debounced, never per-keystroke**: typing updates local state
  immediately, but the actual `getSearchSuggestionsAction` Server Action
  call only fires 250ms after the user stops typing. A stale, now-
  superseded response is dropped (guarded by a monotonically increasing
  request id) rather than clobbering a newer one.
- **Plain search input + a real list of focusable rows (Links or
  buttons, both marked `data-search-result`), not a simulated ARIA
  combobox/listbox** — Arrow Up/Down/Enter/Escape all work via real focus
  movement between independently-tabbable elements (a native `keydown`
  listener scoped to the results container), not a synthetic
  `aria-activedescendant` relationship.
- **Focus management**: `GlobalSearchProvider` captures
  `document.activeElement` the moment it opens (its own triggers are
  plain buttons, not Radix `Dialog.Trigger`, so Radix's own automatic
  focus-return can't track them) and restores it via the dialog's
  `onCloseAutoFocus` — the one place that reliably wins over Radix's
  internal focus-restore-on-unmount rather than racing it.
- **Recent searches** (`features/search/recent-searches.ts`) — last 5,
  de-duplicated case-insensitively, `localStorage`-only (never sent to
  the server, never a "Search History" management surface). Recorded the
  moment a query is actually searched (post-debounce), not only once a
  result is clicked — closing without picking anything still means the
  search happened and is worth remembering.
- **"See all results"** always leads to `/discover?q=...` — the exact
  same `searchAll`-backed results system as the full page, never a
  second, parallel search implementation.

### Mobile

Mobile keeps its own icon trigger and gets the same dialog, but never
the desktop Navigate section (see above) — it's purpose-built touch
search plus a couple of real quick actions, not a mechanical copy of
desktop ⌘K's full destination list. There is no mobile-specific command
palette UI beyond that — one dialog implementation, one section hidden
per breakpoint, not a forked component.

## Full results page (`/discover?q=`)

`features/discover/search-results.tsx` — the same unified ranked list,
just with more results and an optional, compact type filter
(`SearchResultTypeFilter`: All/Movies/Shows/People, "All" always the
default and the initial architecture). "Show more" reveals up to
`SEARCH_RESULTS_MAX_LIMIT` (40) from the same already-ranked candidate
set via a bounded second request (`?expanded=1`), not deep provider-side
pagination.

## Quick Save from a result

`SearchResultRow` reuses `PlanningControl` (the exact same component/
Server Actions Movie/Show Details already use) in its `compact` mode — an
icon-only saved state (a tooltip carries the "Watchlist"/"Backlog" text
instead of a visible Button label) so it doesn't force a wide fixed-width
slot onto a dense result row. Save only ever renders for media that
hasn't started being consumed yet (`none`/`watchlist`/`backlog`); an
already Watched/Watching/On hold/Dropped result shows its state as quiet
text instead (`MediaStateHint`), exactly like Library.

## Discover editorial collections

`features/discover/discover-editorial-collections.tsx` — real, honestly-
labeled collections derived from actual TMDB metadata (top-rated, newest,
runtime), never invented editorial judgments ("Hidden gems") MEDIO has no
human curation to back, and never a duplicate of Home's own Trending/
Popular/In-theaters rows (see `docs/architecture.md`, "Home vs Discover"
— Home owns timely/current public collections; Discover owns intentional
exploration). One row per media-type mode:

- **Acclaimed movies** — `discoverMovies({ sort: "top_rated" })`.
- **Under 100 minutes** — `discoverMovies({ sort: "popular", runtimeLte:
  100 })`, movies-only (TMDB's TV runtime data is far less reliable) — a
  real, deliberately modest ceiling, not an arbitrary filter.
- **New TV** — `discoverShows({ sort: "newest" })`.

`discoverMovies`/`discoverShows` (`server/tmdb/queries.ts`) are the
genre-*less* siblings of the existing `discoverMoviesByGenre`/
`discoverShowsByGenre` — same endpoints, no `with_genres` constraint. Kept
as separate functions rather than making the genre param optional on the
existing ones: every existing call site (genre pages, genre rows) always
has a real genre, so an optional param there would just be dead branching
for them.

## Genre browsing

The curated 6-genre rows (`docs/media-provider.md`, "Genre discovery")
are a deliberate featured subset, not TMDB's full genre list — `More
genres` (`features/discover/more-genres.tsx`) is the escape hatch: plain
compact text links to the remaining real genres' own dedicated pages,
never a second row of visual tiles. Both the curated genre rows and the
dedicated genre pages now compose batched personal state (the same
`getPersonalStates` as everywhere else), so a saved/watched title shows
its quiet corner mark there too — previously only the genre *rows'*
movies did (via the older, narrower `getWatchedMovieIds`).

## What this phase deliberately does not include

Notifications, social discovery, friend recommendations, collaborative
filtering, AI/natural-language/voice search, saved searches, dozens of
advanced filters, user-created genres/tags, public reviews, a search-
engine replacement, or provider/streaming-service filtering (see
CLAUDE.md, "Explicitly Out Of Scope"). Fuzzy/typo-tolerant matching and
provider-suggested spelling corrections are also not implemented — this
phase's ranking is deliberately literal-text-first; "do not fake
suggested corrections" the product spec's own words.
