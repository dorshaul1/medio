# Calendar

`/calendar` is MEDIO's **Personal Release Intelligence** surface: it shows
what is becoming relevant to *this user's* viewing life, when, and what
they can do about it. It is not a public release database and not a
generic calendar app — see `CLAUDE.md`, "Calendar", for the durable rules
this document expands on.

## Calendar is a projection, not a table

There is no `calendar_events` table and no Calendar-specific persistence
anywhere. Every `ReleaseEvent` (`server/calendar/types.ts`) is derived at
request time from two things: the user's own relationships (Tracking's
`watching` shows, Planning's Watchlist/Backlog items) and current external
release metadata (TMDB's `next_episode_to_air`/`last_episode_to_air` on
`ShowDetails`, and `MovieDetails.releaseDate`). Nothing here is a source
of truth — the tracking/planning tables remain the only source of truth,
exactly as they already were.

## Personal relevance, not a public feed

Calendar never fills itself with every trending/popular/now-playing
release. Events exist only for:

1. A new available episode from an actively-tracked (`watching`) show
   (`relevance: "activeShow"`).
2. A saved show's upcoming episode (`"backlogShow"`/`"watchlistShow"`).
3. A saved movie's release date (`"backlogMovie"`/`"watchlistMovie"`).

Dropped shows, completed shows with nothing left, and the broader TMDB
catalog never appear. `server/calendar/candidates.ts` gathers these as
cheap, bounded local-DB reads (`CALENDAR_ACTIVE_SHOW_CANDIDATE_LIMIT`/
`CALENDAR_PLANNED_CANDIDATE_LIMIT`, see `constants.ts`) *before* any
provider hydration happens — the same candidate-first pattern Home/Pick/
Stats already use.

## Event types

`server/calendar/types.ts` defines exactly two concrete event shapes:

- `EpisodeReleaseEvent` — one episode becoming available. `isSeasonPremiere`/
  `isShowPremiere` are booleans on this same shape (derived from
  `episodeNumber === 1` / `seasonNumber === 1 && episodeNumber === 1`),
  not three separate near-duplicate types (`EpisodeReleaseEvent`/
  `SeasonPremiereEvent`/`ShowPremiereEvent`) — they're structurally
  identical (a title, a date, an episode coordinate), so splitting them
  would trade one honest union for speculative type proliferation.
- `MovieReleaseEvent` — a saved movie reaching its one release date.

Both share `ReleaseEventCommon` (`date`, `relevance`, `hasAired`) — a
small common base, not one giant object with dozens of nullable
properties.

## TV: the strongest domain

TV gets the deepest event logic. For each actively-tracked show
(`hydrateActiveShowEvents` in `compose.ts`), up to two events can exist:

- **Upcoming**: `ShowDetails.nextEpisodeToAir`, only while it's still
  genuinely in the future (`!hasAired`).
- **New Episode Available**: the show's own `nextUnwatchedEpisode`,
  computed via the exact same unified `getShowEpisodeProgress` domain
  Home/Library/Show Details already use — never a separate calculation.

### "New Episode Available" is derived, never persisted

There is no `new_episode_available` status anywhere. A Caught Up show
whose next episode airs today is understood to have something new purely
because `getShowEpisodeProgress`'s `nextUnwatchedEpisode` now includes
that episode (it's aired and unwatched) — Calendar, Home, and Library all
recompute from the same event rows and arrive at the same answer, with no
manual status flip anywhere.

### Cross-product consistency

`hasKnownFutureEpisode` (see `docs/tracking.md`) is the one signal that
makes `waiting` real (vs. `caught_up`). Calendar, Home, Library, and Show
Details all pass `show.nextEpisodeToAir !== null` for this — the same
`ShowDetails` fetch, the same boolean. A prior bug where
`server/library/compose.ts`'s own `resolveShowViewingState` call still
hardcoded `false` (while its neighboring `fetchNextEpisode` call already
passed the real value) was fixed as part of this phase — Library's
*displayed* derived state and its *next-episode* computation could
previously disagree with each other, let alone with Home/Calendar.

### Planned (not-yet-tracked) shows

A saved-but-not-yet-tracked show only ever gets two kinds of event: its
next scheduled episode (`nextEpisodeToAir`), and a **recent premiere**
(`lastEpisodeToAir`, only when `episodeNumber === 1`). An ordinary
mid-season `lastEpisodeToAir` is never surfaced — the user hasn't started
watching, so a random episode airing isn't a meaningful "release" to them;
only a season/series premiere is. Starting to actually track (or
watching an episode) never happens automatically just because a premiere
occurred — see `CLAUDE.md`, "Home"/"Library", "never auto-start tracking".

### Known limitation: same-day multi-episode drops

Calendar's TV data source is each show's own `nextEpisodeToAir`/
`lastEpisodeToAir` fields — one episode each, not a full season fetch.
This means a genuine same-day multi-episode "season drop" (some shows
release several episodes at once) cannot currently be detected; each
show contributes at most one upcoming + one recently-aired event, and
they're virtually never the same date. `group.ts`/`CalendarEventGroup`
already handle a group with more than one event correctly (they render
every event in it), so this is a data-source limitation, not a rendering
one — a real fix would mean fetching full season episode lists per show,
which this phase deliberately does not do (see `docs/media-provider.md`,
"Show Details never eagerly fetches every season's episodes").

## Movies: deliberately smaller

Movie events use `MovieDetails.releaseDate` — TMDB's one generic release
date — with no theatrical/digital/physical breakdown (TMDB doesn't
reliably support one) and no region personalization (there is currently
no region/streaming preference in this application — see `CLAUDE.md`,
history around Phase 19's full removal). This is an honest, documented
scope limit, not an oversight.

## Episode airing semantics

An episode is only ever treated as available once it has a real air date
on or before "now" — a missing air date is conservatively "not aired,"
never assumed. `hasAired` (`server/calendar/date.ts`) is Calendar's own
copy of this rule (it cannot import `server/tracking/progress.ts`'s
private copy, and server code never depends on `features/`) but applies
the identical definition. Calendar never treats an episode as watchable
merely because it exists in provider metadata.

## Date-only handling and timezone

Every event date is `YYYY-MM-DD`, TMDB's own date-only value — it has no
meaningful time-of-day, and Calendar never fabricates one ("Today" or
"Aug 17", never "Aug 17 at 12:00 AM"). `server/calendar/date.ts` is the
one place this reasoning lives:

- `parseDateOnly` parses the string directly into numeric parts — it
  never round-trips through `new Date(dateOnly)` + local getters, the
  classic bug where a UTC-midnight instant read back with local getters
  silently lands on the previous/next calendar day depending on the
  viewer's offset.
- `todayParts(now, useLocalTimezone)` is the one place a real `Date`
  instant is read for "what day is it right now." Before a client
  component has mounted, `useLocalTimezone: false` uses UTC getters — a
  value that's provably identical whether computed on the server or the
  client's very first render, avoiding a hydration mismatch. After
  mount, `true` switches to the browser's real local day, the only
  *correct* basis for "did this land on Today/Tomorrow." This is the
  exact same SSR-safe pattern `features/diary/diary-date-grouping.ts`
  already established for Diary; Calendar's `CalendarUpcoming`/
  `CalendarMonthView` replicate it via a `mounted` state flip.
- `formatReleaseDate` only ever returns "Today"/"Tomorrow"/"Yesterday"
  once `useLocalTimezone` is `true` — before that, every date gets a
  plain "Aug 17" label instead of guessing.

There is no "Week starts on" setting in this application (it doesn't
exist as a Settings preference — see `CLAUDE.md`, Settings), so
`server/calendar/month-grid.ts`'s month view always starts weeks on
Sunday, the same fixed `en-US` convention the rest of this app's date
formatting already assumes, rather than inventing a new preference to
satisfy a suggestion from an earlier draft of this phase's spec.

## Grouping and ranking

`groupReleaseEvents` (`group.ts`) collapses same-date, same-kind,
same-identity events into one `ReleaseEventGroup` — UI renders one row
per group, never one row per raw event, keyed by
`` `${date}:${kind}:${identity}` `` (the `kind` component defends against a
movie and a show sharing the same numeric provider id, the same concern
`server/pick/candidate-key.ts` documents elsewhere).

`rankReleaseGroups` (`rank.ts`) orders chronologically first
(`compareDateOnly`, which works directly on the ISO strings — they sort
correctly as plain strings), then by `RELEVANCE_PRIORITY`
(activeShow → backlogShow → watchlistShow → backlogMovie →
watchlistMovie — shows always rank above movies at the same intent
tier), then a stable alphabetical title tie-break — never provider
popularity as a signal.

`buildReleaseTimeline` (`timeline.ts`) buckets grouped/ranked events into
`recent`/`today`/`tomorrow`/`thisWeek`/`later`, using `daysBetween`
against a `CALENDAR_RECENT_WINDOW_DAYS` (7-day) look-back and a
`CALENDAR_UPCOMING_HORIZON_DAYS` (90-day) look-ahead — anything further
out or further back is dropped entirely, never accumulated as unbounded
future/past data. This is deliberately distinct from Home/Library's Up
Next: it's a short *recovery* window for a release the user might have
missed, not "every unwatched episode ever" (that job stays Home's/
Library's).

## Provider freshness

`getShowDetails`/`getSeasonDetails` use a 3-hour revalidation window
(`SHOW_DETAILS_REVALIDATE_SECONDS` in `server/tmdb/queries.ts`) rather
than the 24-hour window the rest of "static" details data uses — a full
day of caching could leave a freshly-aired episode invisible to Calendar
(and Home/Library, which read the same fields) for up to a day. Movie
details/credits/trailers/etc. are unaffected; they aren't temporally
sensitive the way `next_episode_to_air` is.

## Information architecture

Two views, never Day/Week/Month/Year/Agenda like a generic calendar app:

- **Upcoming** (default) — a chronological agenda:
  Recently released/Today/Tomorrow/This week/Later. A section with no
  events never renders its heading (`CalendarSection` returns `null`).
- **Calendar** — a compact month grid (`CalendarMonthView`), quiet by
  design: no per-category *colors*, no time-of-day columns, no draggable
  events, no dense bordered table (a plain `role="grid"`/`role="gridcell"`
  pairing was deliberately avoided here too — see `CLAUDE.md`, "no
  casual `role=\"grid\"` without full behavior" — this is a button grid
  with real keyboard/tab semantics, not a fake composite widget). The
  selected day's actual releases still render using the same event rows
  Upcoming uses, below the grid — but every cell (`CalendarMonthDayCell`)
  already answers "what's here" on its own, without a click:

  ### Month view artwork

  - A day with **exactly one** release names that title directly in the
    cell (the show's own title for an episode — never the episode's own
    title, same spoiler-safety reasoning `UpNextCard` documents for
    Home's Up Next, and there's no room for a spoiler-reveal control at
    this size anyway). When TMDB has a backdrop or poster for it, that
    art becomes the cell's own full-bleed background too — the same
    "real artwork, fixed dark scrim, fixed white text" language
    `UpNextCard`/`part-of-collection-row.tsx` already use for floating
    text over unpredictable art in either theme. Missing artwork is a
    real, common case (see CLAUDE.md, "Visual system" — "an intentionally
    designed fallback"), so the title still shows on a plain Clay-tinted
    background instead when there's no image.
  - A day with **more than one** release has no single title to anchor
    either treatment to, so it falls back to small restrained-Clay
    `Tv`/`Clapperboard` icons instead — shape distinguishes TV vs. movie,
    never a rainbow per-category palette.
  - The selection ring is deliberately **not** `ring-inset`: an inset
    ring is a box-shadow painted inside the button's own box, which an
    artwork cell's absolutely-positioned Image/scrim (later children,
    painting above the button's own background/shadow layer) would
    visually cover entirely. A normal (outer) ring paints outside the
    border box, where those `inset-0` children never extend to — visible
    on every cell kind.
  - The ring only ever marks the **selected** day, never merely "today":
    today gets its own quiet, permanent cue (the day number rendered in
    `text-primary`, independent of selection), but doesn't earn a border
    just for being today — only the day actually selected does.
  - Month navigation is prev/next chevrons plus a "Today" link back to
    the current month — shown only while viewing a *different* month, so
    it's never a dead control sitting next to the chevrons when it
    wouldn't go anywhere new.

`?view=`/`?type=`/`?month=` are the only URL-addressable state — no
search box, no full filter toolbar.

### Default view preference

An explicit `?view=` always wins. When absent, `normalizeCalendarView`
falls back to the user's own "Default Calendar view" Setting
(`calendarDefaultView` on `user_preferences`, Upcoming/Calendar, default
Upcoming — see docs/settings.md) rather than a hardcoded "Upcoming". This
is exactly the same shape Discover's own `discoverDefaultType`/
`normalizeDiscoverMediaType` already use. Because the default is no
longer universally "Upcoming", `CalendarViewToggle`'s links always pin
`?view=` explicitly, even when linking to Upcoming — omitting it would
mean "defer to my preference" instead of "go to the tab I just clicked",
which would silently do nothing for a user whose stored default is
Calendar.

## Quick tracking

The trailing quick-tracking control (`EpisodeWatchControl`, reused
unchanged from the Season page) only ever appears for an episode event
with `relevance: "activeShow"` **and** `hasAired: true` — i.e. exactly
the "New Episode Available" case. It never appears for a not-yet-aired
episode (informational only, no disabled button) and never for a
planned-but-not-tracked show (there's nothing to "mark watched" for a
show the user hasn't started). Because every such event is, by
construction, the show's own `nextUnwatchedEpisode`, it is always
unwatched — no separate summary fetch is needed.

Marking it watched calls the same `markEpisodeWatchedAction` Season/
Library/Home already use, which now also calls
`revalidatePath("/calendar")` (added in this phase, alongside its
existing `/`, `/shows/[id]`, `/library` revalidations) — Calendar picks
up the change on its own next server render, with no hard reload.

## Spoiler protection

Reuses the one centralized policy (`resolveEpisodeSpoilerDecision`)
unchanged — Calendar never reinterprets it. Only the episode's own
still/title are spoiler-sensitive (Strict mode); the *show's* identity
always stays visible, since Calendar's whole point is "which show has
something new" across many shows at once — unlike the Season page, where
the show is already the page's own context. `CalendarEpisodeEventRow`'s
reveal button and the row's navigation link render as siblings, never
nested (an anchor cannot contain a `<button>`), sharing one local
`revealed` state exactly like `EpisodeSpoilerContent` does on the Season
page. Movie events have no spoiler concern at all (spoiler protection is
a TV-episode-progression concept only — see `CLAUDE.md`, "Settings").

## Home integration

`features/home/calendar-entry-point.tsx` mirrors `PickEntryPoint`: a
restrained icon+text `Button` in Home's header, `Calendar` (plus
` · N this week` once `getWeeklyReleaseCount` resolves — its own async
Server Component/Suspense boundary, so a slower Calendar fetch never
delays the rest of Home's header, matching `PersonalizedHomeSections`'
own null-fallback precedent). "This week" is `today + tomorrow +
thisWeek` group counts — deliberately excludes `recent` (a forward-
looking teaser, not a missed-releases prompt) and counts groups, not raw
events, so the number matches what the user will actually see as
distinct rows.

## Show Details integration

`ShowTrackingSection` renders a small "Season 3 premiere · Aug 17"-style
line from the same `nextEpisodeToAir` prop it already receives, using
Calendar's own `episodeCoordinateLabel`/`formatReleaseDate` — never a
separate calculation. It deliberately renders a plain date (never "Today"/
"Tomorrow") since that framing needs a client mount step this one small
context line doesn't warrant on its own; dates are never spoiler-gated
here either, consistent with `EpisodeRow`'s own air-date meta line.

## Out of scope (this phase)

No push/email/browser notifications, no reminders, no user-created
events, no external calendar sync (`.ics`, Google Calendar), no social
sharing, no full public release database, no streaming-release guesses,
no manual release-date editing, no countdown widgets, no gamification.
The event model (a clean discriminated union, never persisted) is shaped
so a future notification feature could consume it without redesigning
this domain — but no notification infrastructure exists yet.
