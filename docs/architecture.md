# Architecture

## Current principles

- App Router. No Pages Router, no legacy Next.js patterns.
- Server Components by default. `"use client"` is added only when something
  genuinely needs state, event handlers, browser APIs, effects, or a
  client-only dependency — and the boundary stays as narrow as possible.
- Feature-oriented growth. Structure follows what the product actually needs,
  not a speculative folder tree set up in advance.
- External integrations (database, auth, media providers, etc.) will live
  behind explicit server-side boundaries, not scattered through the app.
- No premature abstractions: no repository pattern, service layer, factories,
  or DI containers without an actual, current requirement.
- Dependencies are added only when a phase concretely needs them.

## Directory ownership

- **`app/`** — routing, layouts, and route-level Next.js concerns. Pages stay
  thin; real logic lives closer to the feature or domain it belongs to.
- **`components/ui/`** — low-level design-system primitives (Radix-derived
  where real interaction behavior is needed, fully owned/redesigned source —
  see `docs/design-system.md` for the current list). Not a vendored package.
- **`components/shell/`** — the application shell: `AppShell`, `DesktopNav`,
  `MobileNav`, `UserIdentityLink` (the avatar + name/avatar-only link to
  Settings → Account — see docs/settings.md, "Identity link"),
  `UserAvatar` (real image or initials fallback, wraps
  `components/ui/avatar.tsx`), `PageContainer`, `PageHeader`, `BackButton`
  (a real browser-history back — used by a genre's "View all" page,
  reachable from several different places, so no fixed destination Link
  could stand in for it; deliberately *not* used on Movie/Show Details —
  primary nav is how those are left). Composed from primitives, owned by
  this application, used by every route inside the `(app)` route group.
- **`components/`** (outside `ui/`/`shell/`) — other app-level composed
  components (`theme-provider.tsx`, `theme-toggle.tsx`). Cross-feature
  *product* components go here too, once there's UI actually shared across
  more than one feature.
- **`features/`** — domain-specific application functionality, each
  self-contained:
  - **`features/media/`** — presentation reusable across any media-heavy
    screen: `MediaPoster` (the browse tile), `MediaCollectionRow` (a
    horizontally browsable section) and `MediaRowScroller` (its one
    client boundary — optional desktop scroll-button chrome; the row's
    content stays server-rendered, passed in as `children`), their
    loading skeletons, the missing-artwork fallback, `mediaHref` (the
    canonical `/movies/[id]` / `/shows/[id]` route builder — see "Routes"
    below), and detail-page building blocks shared by Movie and Show
    Details specifically: `MediaDetailHero` (the artwork
    shell — backdrop bleed, poster, overlap positioning; each page
    supplies its own identity/metadata column as `children`,
    so the two pages' information hierarchy stays genuinely different —
    see the `features/movies/`/`features/shows/` entries below),
    `MetadataLine`/`providerRatingPart` (the "·"-separated metadata row),
    `TrailerButton` (the one Dialog-based, lazily mounted YouTube
    trigger), `CastMemberTile` (the whole tile is a link to
    `/people/[id]` — see `docs/media-provider.md`, "People"),
    `PersonLink` (the restrained inline text link for a director/creator
    name sitting inside a sentence, distinct from `CastMemberTile`'s
    card-link), `person-route.ts` (`personHref` — the canonical
    `/people/[id]` URL builder, same pattern as `mediaHref` below),
    `PlanningControl` (Movie/Show Details' shared
    Watchlist/Backlog save control — planning logic doesn't differ by
    media type, so this and its Server Actions live here rather than
    duplicated per media type; see `docs/library.md`), `hasReleased`
    (the shared "has this actually come out yet" check for a movie's
    `releaseDate`/an episode's `airDate` — same date shape, same UTC
    parsing rule, one implementation), and
    `formatRuntime`/`truncateOverview`.
  - **`features/discover/`** — Discover-specific: the URL-driven search
    input and results, the Movies/Shows mode toggle, curated genre
    selection/slugs, and the dedicated genre-browse page's sort/pagination
    controls. Not reused elsewhere — genuinely Discover-specific
    composition (e.g. `SearchResultRow`'s horizontal scan layout differs
    deliberately from `MediaPoster`'s browse tile).
  - **`features/home/`** — Home's collection sections (thin wrappers
    around `server/tmdb` queries + `MediaCollectionRow`).
  - **`features/movies/`** — Movie Details' own composition: `MovieHero`
    (built on the shared `MediaDetailHero`; adds title/tagline/metadata/
    director/trailer trigger as its `children`), `MovieCastRow` (reuses
    `MediaRowScroller` + the shared `CastMemberTile`), `PartOfCollectionRow`
    (the franchise-collection section — a bespoke full-bleed-artwork card,
    not `MediaCollectionRow`, since a collection has its own real
    poster/backdrop worth surfacing as the card's identity; the one
    deliberately earned container/border in this feature),
    `MovieRecommendations` ("More like this", reuses `MediaCollectionRow`
    directly), and small pure helpers (`parseMovieId`).
  - **`features/shows/`** — Show Details' and Season Details' own
    composition, deliberately not sharing Movie Details' information
    hierarchy beyond the artwork shell (see `features/media/`
    `MediaDetailHero` above): `ShowHero` (year range + provider status
    read together, a distinct "N seasons · N episodes" scale line, and
    `Created by` — none of which a movie has), `SeasonRow`/`SeasonTile`
    (Show Details' primary product surface — a horizontal row, not tabs,
    so it scales from 1 season to 30+; sorted by `sortSeasons`, which
    orders Specials/season 0 last and drops zero-episode seasons),
    `ShowCastRow` (TMDB's *aggregate* credits — see
    `docs/media-provider.md`, "TV credits"), `ShowRecommendations`,
    `EpisodeList`/`EpisodeRow` (the season page's core content — a plain
    divided list, not per-episode cards, so a long season stays scannable;
    each row's trailing edge is a compact watched/unwatched toggle —
    `EpisodeWatchControl` — never a checkbox column, no episode detail
    page), `SeasonProgress` (a quiet aired/watched readout, not a
    gamification meter), `SeasonAdjacentNav`/`SeasonSelect` (Previous/Next
    as real links + a compact jump-to-season dropdown, both URL-driven),
    `ShowTrackingControl`/`ShowTrackingSection` (Show Details' personal
    status + progress — Suspense-deferred, the one section that fetches
    every regular season's episodes for accurate progress; see
    `docs/tracking.md`), and pure helpers (`parseShowId`,
    `parseSeasonNumber`, `sortSeasons`, `formatShowYearRange`,
    `showViewingStateLabel`, `pluralize`).
  - **`features/library/`** — the `/library` route's own composition:
    `LibraryItemRow` (one shared row shell with kind-specific personal-
    context content — a discriminated switch over `LibraryItem["kind"]`,
    not one prop-monster card), `LibraryItemActions` (planned items' move/
    remove menu), `LibraryTypeToggle`/`LibrarySelect` (URL-driven media
    type/state/sort filters), `LibraryEmptyState`, `LibrarySectionNav`
    (the small breadcrumb-style Library/Diary switcher, reused by
    `features/diary/` too — see below), and `library-params.ts` (parses/
    normalizes/validates the page's `?type=`/`?state=`/`?sort=`/`?count=`
    URL state — see `docs/library.md`).
  - **`features/diary/`** — `/library/diary`'s own composition:
    `DiaryTimeline` (the one Client Component — local-timezone date
    grouping, per-day session grouping, and "Load more" pagination within
    the requested month, seeded from the server's first page),
    `DiaryEntryRow`/`DiaryMovieEntry`/`DiaryEpisodeEntry` (a discriminated
    switch over `DiaryEntry["kind"]`, same reasoning as `LibraryItemRow`),
    `DiaryEpisodeSession` (a collapsed same-day binge session, expanding
    to the same `DiaryEpisodeEntry` rows), `DiaryEntryMenu` (the shared
    Edit watch date/Delete contextual menu, dispatching to the exact same
    tracking Server Actions `features/movies/`/`features/shows/` already
    expose — no parallel mutation path), `DiaryFilterToggle` (URL-driven
    All/Movies/TV filter, month-preserving), `DiaryMonthNav` (prev/next/
    Today + the compact month/year picker), `diary-date-grouping.ts` (the
    pure day-grouping function), `diary-session-grouping.ts` (the pure
    binge-session grouping function), `diary-month-summary.ts` (the
    monthly overview line), `diary-ordinal.ts` (rewatch ordinal → English
    label), and `diary-params.ts` (`?type=`/`?sort=`/`?month=` URL state —
    see `docs/diary.md`).
  - **`features/people/`** — `/people/[id]`'s own composition:
    `PersonHeader`/`PersonProfileImage` (the quiet editorial identity
    block — no Movie/Show Details hero reused, see `docs/media-provider.md`),
    `PersonBiography` (a clamp-with-`Read more` Client Component, measures
    real overflow rather than guessing from character count),
    `PersonKnownForRow`/`PersonFilmographyFilter`/`PersonFilmographyList`/
    `PersonFilmographyRow` (the Filmography section — a dense divided list,
    not poster cards, since a career can run to hundreds of credits; the
    filter is real `?credit=` links, and "Show more" is a bounded client
    reveal over data already fetched once), and `parse-person-id.ts`. The
    actor/director/creator link components themselves
    (`CastMemberTile`/`PersonLink`/`person-route.ts`) live in
    `features/media/` instead, since Movie/Show Details are their real
    callers — see that entry below.
  - **`features/stats/`** — `/stats`'s own composition, shared by both
    tabs: `StatsRangeControl` (the compact `?range=`/`?compare=` chip
    row), `StatsTabs` (the `?tab=overview|taste` switch). Overview-tab
    sections: `StatsHero` (the opening headline + count line),
    `StatsComparisonSection` (Compare's plain-language facts),
    `StatsTimeline` (the range-granularity-aware viewing-rhythm chart,
    with a "busiest month → Diary" link), `StatsWeekdaySection` (the
    day-of-week breakdown), `StatsPatternsSection` (Movie vs Show
    balance + show completion tendency). See `docs/stats.md`.
  - **`features/taste/`** — the Taste tab's own composition:
    `TasteHero`, `TasteGenreSection`, `TastePeopleSection`/
    `TastePersonTile`, `TasteRewatchSection`/`TasteTitleCard` — kept as
    their own vocabulary since they represent a distinct analytical
    concept (genre/people/rewatch preference) from Overview's temporal
    viewing activity, even though both tabs share one route and one
    `StatsProfile` fetch. See `docs/taste.md`.
  - **`features/settings/`** — `/settings`'s own composition:
    `SettingsNav` (the category rail/mobile list, with a leading icon per
    category), `SettingRow`/`SettingsCategoryHeader` (the shared open
    layout), `VisualChoice`/`TextChoice` (the two reusable choice
    primitives — see docs/settings.md), one `*-mini-preview.tsx` per
    visual choice (Theme/Density/Motion/Spoiler protection/Home layout),
    one `*-setting.tsx` per individual preference, one `*-settings.tsx`
    composition per category (Account/General/Appearance/Tracking/
    Spoilers/Home/Defaults/Data/Developer), `reset-preferences-control.tsx`,
    `settings-actions.ts` (the Server Action wrappers), and the
    Developer-only `seed-mock-data-control.tsx`/
    `reset-all-data-control.tsx`/`dev-tools-actions.ts`. Account's own
    pieces — `account-settings.tsx`, `display-name-setting.tsx` (saves on
    blur/Enter via `authClient.updateUser`), `change-password-control.tsx`
    (a Dialog around `authClient.changePassword`), `logout-control.tsx`
    (the canonical Logout, moved here from the app shell) — call Better
    Auth's client directly rather than going through
    `server/preferences/`, since none of it is a `UserPreferences` row.
    See `docs/settings.md`.
- **`server/db/`** — the database connection (`index.ts`: pool + Drizzle
  instance, plus the shared `Transaction` type for domain code that needs
  to accept either `db` or an in-flight transaction) and schema modules
  (`schema/`, including `auth.ts`, `tracking.ts`, and `planning.ts`).
  Server-only.
- **`server/auth/`** — Better Auth configuration (`config.ts` pure factory,
  `index.ts` the real app instance, `cli.ts` the schema-generator-only
  instance) and server-side session access (`session.ts`). Server-only —
  see `docs/authentication.md`.
- **`server/media/`** — application-owned media domain models
  (`MediaSummary`, `MovieDetails`, `ShowDetails`, ...), independent of any
  external provider's field names.
- **`server/tmdb/`** — the TMDB integration boundary (client, response
  validation, mapping to `server/media` models, the query surface, image
  URL building). Raw TMDB shapes never escape this directory — see
  `docs/media-provider.md`.
- **`server/people/`** — pure Filmography composition, no I/O:
  `types.ts` (`CreditRole`, `PersonFilmographyEntry`/`Section`,
  `PersonKnownForItem` — the display-level shapes `features/people/`
  actually renders) and `compose.ts` (`buildFilmographySections` —
  Directing/Writing/Producing/Acting grouping, dedup, sort, primary-
  profession ordering; `selectKnownFor`; `personAge`). Deliberately no
  `queries.ts`: unlike `server/home/`, there's only one real caller
  (`features/people/person-filmography.tsx`), which does its own
  `getPersonCombinedCredits` fetch + calls these directly — the same
  proportionate choice as `ShowCastRow`/`MovieRecommendations` (fetch +
  render in the feature component) rather than a speculative extra
  layer. See `docs/media-provider.md`, "People".
- **`server/tracking/`** — the tracking domain: application-owned models
  (`types.ts`), pure domain logic with no I/O (`progress.ts`,
  `derived-state.ts`, `compute-show-progress.ts`), and server-only
  commands/queries that derive the acting user from the session
  themselves (`movie-events.ts`, `episode-events.ts`, `show-state.ts`).
  Movie/Show/Season Details' tracking controls read and write this
  directly (never through Library) — see `docs/tracking.md`.
- **`server/planning/`** — the planning domain: application-owned models
  (`types.ts`) and server-only commands (`planning-items.ts`) for
  Watchlist/Backlog. The one narrow, one-directional dependency
  `server/tracking/` has on another domain (clearing a planning entry when
  tracking starts) lives here too — see `docs/library.md`, "Planning
  clears when tracking starts".
- **`server/library/`** — composes Planning + Tracking + TMDB into
  `LibraryItem` view models: `types.ts` (the discriminated `LibraryItem`
  union), `candidates.ts` (the paginated SQL candidate query, DB-only, no
  provider data), `approximate-progress.ts` (the Library-scale progress
  approximation — deliberately less precise than Show Details' own, to
  avoid an N×season provider fetch per visible show), `compose.ts`
  (hydrates one page of candidates with provider metadata), and
  `queries.ts` (`getLibraryPage` — the one reusable Library-scale read).
  See `docs/library.md`.
- **`server/diary/`** — the Watch Diary's read model, composing
  `movie_watch_events`/`episode_watch_events` (never a Diary table of its
  own) with TMDB metadata: `types.ts` (the discriminated `DiaryEntry`
  union, plus `DiaryPeriod`/`DiaryMonthActivity`), `events.ts`
  (`listDiaryEvents` — the one cross-type `UNION ALL` keyset-paginated
  query, optionally bounded to one UTC calendar month via `period`, with
  rewatch ordinal always computed over each partition's entire history
  via a SQL window function; `getDiaryActivityCalendar` — one aggregate
  query powering the month/year picker and the monthly overview line),
  `hydrate.ts` (bounded, deduplicated provider hydration — one fetch per
  distinct movie/show/season, never per event), `queries.ts`
  (`getDiaryPage`/`getDiaryActivityCalendar` — the reusable reads, own the
  session boundary), and `constants.ts` (`DIARY_PAGE_SIZE`,
  `DIARY_SESSION_MAX_GAP_MINUTES`). See `docs/diary.md`.
- **`server/shows/`** — the one show-scoped provider+tracking composition
  shared across features: `show-episode-progress.ts`'s
  `getShowEpisodeProgress` fetches every regular season's episodes for a
  *single* show and computes exact progress from them — the deliberate
  exception to "never eagerly fetch every season's episodes," written
  once and shared by Show Details (`features/shows/show-tracking-view.ts`)
  and Home's bounded active-show candidates (`server/home/`).
- **`server/home/`** — personalized Home's read model: `types.ts`
  (`ActiveShowContinuation`, `PersonalHome`), `constants.ts`
  (`HOME_ACTIVE_SHOW_CANDIDATE_LIMIT`,
  `FINISH_SOON_MAX_REMAINING_EPISODES`), `classify.ts`
  (`classifyActiveShows` — the pure Up Next/Finish Soon/Continue Watching
  precedence/deduplication logic), and `queries.ts` (`getPersonalHome` —
  candidate-first: cheaply queries `watching` shows, hydrates only a
  bounded set via `server/shows/`, then classifies). See `docs/home.md`.
- **`server/stats/`** — personal Stats/Taste read model: `types.ts` (the
  `StatsProfile` projection and its `Taste`-prefixed input/insight
  shapes, plus `StatsComparison`/`ActivityBucket`/`ViewingRhythm`),
  `constants.ts` (every sample-size/hydration-bound threshold),
  `range.ts` (`StatsRange`, half-open UTC bounds resolution, `?range=`
  URL parsing — reuses Diary's own month-scoping conventions),
  `aggregates.ts`/`candidates.ts` (pure, optionally range-bounded SQL
  aggregation over watch history — never a per-event fetch),
  `hydration-selection.ts` (the pure bounded-candidate-selection logic),
  `hydrate.ts` (bounded, deduplicated provider hydration), one pure,
  testable module per insight category (`genres.ts`, `people.ts`,
  `rewatch.ts`, `completion.ts`, `movie-vs-show.ts`, `timeline.ts`,
  `viewing-time.ts`, `headline.ts`, `compare.ts` — the Compare-facts
  derivation), composed by `compose.ts` (`getStatsProfile`/
  `getStatsComparison`/`getStatsActiveYears` — the reusable reads, own
  the session boundary; the *one* entrypoint both the Overview and Taste
  tabs render from — there is no separate `server/taste/`). See
  `docs/stats.md`, `docs/taste.md`.
- **`server/calendar/`** — Calendar's Personal Release Intelligence read
  model, composed at request time from Tracking/Planning identity + TMDB
  metadata (never a `calendar_events` table): `types.ts` (the
  `ReleaseEvent` union), `constants.ts` (candidate limits, the recent/
  horizon windows), `date.ts` (the one date-only/timezone-safe arithmetic
  module Calendar uses throughout), `group.ts`/`rank.ts`/`timeline.ts`
  (pure grouping, ranking, and Today/Tomorrow/This week/Later bucketing),
  `month-grid.ts` (the compact month view's pure grid construction),
  `filter.ts` (the All/TV/Movies session filter), `candidates.ts`
  (bounded, candidate-first identity reads), `build-events.ts` (pure
  event shaping from already-hydrated provider data), `compose.ts`
  (`getCalendarEvents` — the one reusable read, owns the session
  boundary), and `weekly-count.ts` (Home's compact "N this week" hint).
  See `docs/calendar.md`.
- **`server/preferences/`** — Settings' persistence layer: `types.ts`
  (`UserPreferences`, always fully populated), `queries.ts`
  (`DEFAULT_PREFERENCES`, `fetchUserPreferences` the unwrapped
  implementation kept exported for test determinism, and
  `getCurrentUserPreferences` — the `React.cache`-memoized export every
  real caller uses), and `mutations.ts` (`updatePreferences`/
  `resetPreferences`). See `docs/settings.md`.
- **`server/spoilers/`** — `policy.ts`'s `resolveEpisodeSpoilerDecision`,
  the one pure, deterministic Spoiler protection policy every surface
  that hides episode content calls. See `docs/settings.md`.
- **`server/dev-tools/`** — local testing tooling only, never reachable
  in production (`guard.ts`'s `assertDeveloperToolsEnabled`):
  `mock-data.ts`'s `seedMockData` (seeds real watch/comment/planning rows
  through the same domain functions a real user action calls) and
  `reset-all-data.ts`'s `resetAllUserData` (the one comprehensive
  per-user data wipe in the app). See `docs/settings.md`, "Developer
  tools".
- **`server/import/`** — the shared Import domain: `types.ts` (the
  `ParsedImportRecord` normalized model + `ImportPlan`), `date.ts`/
  `normalize.ts`/`csv-parse.ts`/`csv-headers.ts` (pure), `parsers/`
  (one pure file per source — `native.ts`/`letterboxd.ts`/
  `generic-csv.ts`), `matching.ts` (I/O — batched TMDB identity
  resolution through `server/tmdb/`), `candidates.ts` (I/O — a bounded
  existing-state snapshot), `plan.ts` (pure — the dry-run plan builder),
  `compose.ts` (I/O — ties matching/candidates/plan together for one
  preview request), `persist.ts` (I/O — the one place a confirmed plan
  is written), `batches.ts` (I/O — list/rollback). See
  `docs/data-portability.md`.
- **`server/export/`** — `native.ts` (the versioned JSON export),
  `csv.ts` (the watch-history CSV, built from Diary's own unified read
  model), `csv-write.ts` (spreadsheet-injection-safe CSV writing),
  `types.ts` (the native export schema the writer and
  `server/import/parsers/native.ts` both depend on). See
  `docs/data-portability.md`.
- **`config/`** — application configuration: the site/brand constant
  (`src/config/site.ts` — `siteConfig.name`, "MEDIO"), the primary
  navigation model
  (`src/config/navigation.ts`), and server environment validation
  (`config/env/`).
- **`lib/`** — genuinely generic, framework-agnostic utilities only:
  `utils.ts` (the `cn()` helper), `auth-client.ts` (browser-side Better
  Auth client — never imports database/server-env), `auth-errors.ts`
  (maps Better Auth error codes to UI copy). Not a dumping ground for
  one-off helpers beyond that.
- **`test/`** — shared test setup only (Vitest/Testing Library setup, jsdom
  polyfills). Not a home for the tests themselves — those stay colocated.

Directories that have no real content yet (`features/`, `server/`) are
intentionally absent rather than stubbed out empty — they will be created the
moment a phase gives them something real to hold.

## Routes and the application shell

`src/app/(app)/` is a route group holding the four primary product
destinations — `/` (Home), `/discover`, `/library`, `/stats` — plus one
shared `layout.tsx` that wraps them all in `AppShell`. The group adds no URL
segment; it exists purely so the shell applies to exactly these routes and
nowhere else.

Nested under it: `/discover/movies/genre/[genre]` and
`/discover/shows/genre/[genre]` (dedicated genre-catalog browsing — see
"Home vs Discover" below), `/movies/[id]` (Movie Details — identity,
essential metadata, overview, cast, trailer, a tracking control, a
planning control when unwatched, and a "More like this" row; see
`docs/media-provider.md`, "Identifiers", for why the URL is a raw TMDB
provider ID), `/shows/[id]` (Show Details — identity, overview, Seasons as
the primary product surface, cast, trailer, a personal status/progress
control, and a "More like this" row), and
`/shows/[id]/seasons/[seasonNumber]` (Season Details — the episode-
browsing and per-episode tracking surface; season number `0` is Specials
and is valid, negative numbers are not), and `/people/[id]` (Person — an
actor/director/creator's identity, biography, and professional
Filmography; reached from Movie/Show Details, never a primary nav
destination — see "Home vs Discover" below for the same "not every screen
is a nav destination" reasoning). `/library` (the personal-media
surface — see `docs/library.md`) lives directly under the group, not
nested under another route; `/library/diary` (the chronological Watch
Diary — see `docs/diary.md`) is nested under it. `/stats` (personal
viewing statistics and taste — see `docs/stats.md`) is its own top-level
primary destination, deliberately not nested under `/library` — it's a
separate analytical concept from Library's own state-oriented and
Diary's chronological views. `/calendar` (Personal Release Intelligence —
see `docs/calendar.md`) is likewise its own top-level route rather than
nested under Library — like `/pick`, it's reached from a restrained entry
point (Home's header, mirroring Pick's own) rather than primary nav; see
`CLAUDE.md`, "Application shell", for why primary nav stays exactly Home/
Discover/Library/Stats. `/settings/[category]` (see docs/settings.md)
is a secondary utility route also inside `(app)` — real, URL-addressable
categories, reached from the account control rather than primary nav; like
`/people/[id]`, `isNavItemActive` marks no primary destination active while
on it. All inherit `(app)`'s auth/shell like any other route.
`isNavItemActive` treats a route nested under a primary destination's own
path as still that destination — a genre page still marks **Discover**
active in the nav; `/people/[id]` matches no primary destination's path at
all, so the nav simply shows no active item while there, the same as
`/library`'s own detail-adjacent routes would if it had any — calm, not
forced into owning a destination it isn't part of.

`mediaHref()` (`features/media/media-route.ts`) is the one place that
builds movie/show URLs; `personHref()` (`features/media/person-route.ts`)
is the equivalent for Person URLs. `next.config.ts` sets `typedRoutes:
true` (added for these — the app's first real dynamic routes) so a
mistyped path is a build-time type error. Building a URL from a runtime
value (an id, a genre slug) needs an `as Route` cast — Next's own
documented pattern for a non-literal href; see the comment on `mediaHref`
for why plain template literals in JSX don't need it but a helper function
returning one does.

`src/app/(auth)/` (`/sign-in`, `/sign-up`) is a second route group, also
with no shell — its own layout redirects an already-authenticated visitor
to `/` before rendering. `(app)`'s layout does the inverse: it requires a
session and redirects an unauthenticated visitor to `/sign-in`. See
`docs/authentication.md` for why that's a UX boundary, not the security
boundary.

`src/app/design-system/` sits outside both groups deliberately: it's the
internal UI reference, not a product destination — it renders under the
root layout only, with no shell/nav, and calls `notFound()` itself when
`NODE_ENV === "production"`, so it resolves to a real 404 in production
regardless of whether the route is linked anywhere.

Navigation destinations (`href`, `label`, icon) are defined once in
`src/config/navigation.ts` and consumed by both `DesktopNav` and `MobileNav`
— neither hardcodes its own copy. Active-route matching (`isNavItemActive`)
lives there too, for the same reason.

**Server/client boundary:** `AppShell`, `PageContainer`, and `PageHeader` are
Server Components. `DesktopNav` and `MobileNav` are Client Components —
the only reason being `usePathname()` for `aria-current` — nothing else in
the shell needs client-side JavaScript. Page content stays server-rendered
inside a single `<main>` landmark that `AppShell` owns.

**Responsive strategy:** one breakpoint (`md`, 768px) decides navigation
mode — a persistent left rail (`DesktopNav`) at `md` and above, a fixed
bottom bar (`MobileNav`, primary destinations only) below it. Both render
in the DOM at all times; Tailwind's `hidden`/`md:flex` pair removes the
inactive one from layout *and* the accessibility tree, so there's never
ambiguity about which nav is "the" navigation at a given viewport.

## Home vs Discover

Two distinct jobs, deliberately not overlapping:

- **Home** (`/`) answers *"what's worth seeing right now?"* for public
  discovery (Trending movies, Trending shows, In theaters, Popular
  movies, Popular shows — each its own section; movies and shows are
  never mixed in one row) **and**, when it exists, *"what makes sense for
  me to watch next?"* for the signed-in user first — Up Next, Finish
  Soon, and Continue Watching (`server/home/`, `features/home/`) render
  above the public sections whenever the user has active viewing, and
  render nothing at all when they don't (see `docs/home.md`). Discover
  never duplicates any of this.
- **Discover** (`/discover`) answers *"help me find something I want to
  watch"* — Unified Search (Movies, Shows, *and* People, one cross-type
  ranked list, URL-addressable via `?q=`; see `docs/search.md`) first,
  then an intentional **Movies/Shows** mode (`?type=movies|shows`,
  default movies) driving Discover's own editorial moment (a real,
  honestly-labeled collection — "Acclaimed movies", "New TV", "Under 100
  minutes" — never an invented judgment or a duplicate of Home's rows), a
  curated set of genre rows each with a **View all** into a dedicated,
  paginated, sortable genre-catalog page, and a **More genres** escape
  hatch to the rest of TMDB's real genre list beyond the curated set.
  Unified Search is also reachable from anywhere in the app via `⌘K`/
  `Ctrl+K` (`GlobalSearchProvider`, mounted in `AppShell`) — the exact
  same ranking/results system as `/discover?q=`, not a second one.

Discover deliberately does not duplicate Home's Trending/Popular sections
— see `docs/media-provider.md` ("Discover vs Trending") for the underlying
query-level distinction. If a future change makes Home and Discover start
looking like the same page again, that's a sign the IA has drifted, not
that a shared component is missing.

## Design system and theming

Semantic color/radius tokens live as CSS custom properties in
`src/app/globals.css` (light under `:root`, dark under `.dark`), mapped into
Tailwind's theme via `@theme inline`. Components consume the semantic
Tailwind utilities this generates (`bg-surface`, `text-muted-foreground`,
...), never a raw color value — see `docs/design-system.md` for the full
token list and rationale.

Theming (`light` / `dark` / `system`) is `next-themes`
(`src/components/theme-provider.tsx`), scoped as narrowly as the client
boundary allows: the provider and the `ThemeToggle` control are the only
Client Components theming needs. The root layout, the design-system preview
page, and everything else involved stay Server Components.

## Data boundary

- **Client Components** must never import database infrastructure.
- **Server Components / server operations** may call domain-specific server
  code once it exists.
- **Domain/server code** uses Drizzle.
- **Drizzle** uses PostgreSQL (via `node-postgres`, one pool per process).

`src/server/db/`, `src/server/auth/` (except `cli.ts`, see
`docs/authentication.md`), `src/server/tmdb/` (except `images.ts`, a
credential-free URL helper — see `docs/media-provider.md`), and
`src/config/env/server.ts` import `server-only`, so an accidental import
from a Client Component fails the build rather than silently reaching the
browser. Full detail — schema conventions, migration workflow, connection
strategy — lives in [`docs/database.md`](database.md); authentication
specifics (session strategy, protected routes, the
security-vs-UX-boundary distinction) live in
[`docs/authentication.md`](authentication.md); the TMDB integration
boundary, domain models, caching, and error strategy live in
[`docs/media-provider.md`](media-provider.md). This section is only the
boundary rule.

## Testing

**Unit/component** (Vitest + Testing Library + jsdom): focused logic and
interactive UI behavior. Colocated with the code under test
(`component.tsx` next to `component.test.tsx`). Run via `pnpm test:run`; part
of `pnpm check`.

**E2E** (Playwright, Chromium): important real application flows and
framework-level boundaries — the things a unit test can't see, like the app
actually booting and serving a page. Lives under `e2e/`, runs against a
production build. Run via `pnpm test:e2e`; deliberately excluded from
`pnpm check` since it builds and boots the app.

Principles:

- Behavior and public contracts over implementation details.
- Deterministic tests — no arbitrary sleeps, no timing-dependent assertions.
- Accessibility-first selectors (role, label, text) over CSS classes or
  `data-testid`.
- No architecture changes solely for test convenience — a Server Component
  does not become a Client Component just to make it easier to unit test.
- No coverage-percentage goals. Test quality over test count.

## Future direction

Later phases will introduce, deliberately and one at a time:

- `/calendar` (still placeholder content; not a primary nav destination —
  see "Application shell")
- email verification, password reset, and other auth capabilities
  deliberately deferred — see `docs/authentication.md`
- tracking UI (Movie/Show/Episode watch controls, show status, progress)
  and Home's personal sections (Continue Watching, Up Next) built on the
  tracking domain that now exists (`docs/tracking.md`) but has no UI yet
- Watchlist/Backlog — a separate future planning domain, deliberately not
  part of the tracking status enum (`watching`/`on_hold`/`dropped`); see
  `docs/tracking.md`
- advanced Discover filtering (year, runtime, rating, watch provider) —
  deliberately not built alongside genre browsing; see
  `docs/media-provider.md`
- TMDB attribution UI — required once real TMDB-sourced content ships (it
  now does), still not placed anywhere; see `docs/media-provider.md`,
  "Attribution"

None of these are designed yet — this document will be updated when they
actually land, not in advance of them.
