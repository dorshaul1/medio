# Home

Home is the primary personal decision surface: *"what makes sense for me
to watch next?"* This document covers the personalization layer; see
`docs/tracking.md` for the tracking domain it derives from and
`docs/library.md` for the related (but distinct) personal-media surface.

## Home's layers

1. **Up Next** — the single strongest next episode to continue. Governed
   entirely by its own preference (`showUpNext`, default on) — see "Up
   Next is a separate preference" below. Renders above everything else,
   in every Home layout, whenever it's on and a valid candidate exists.
2. **Personal continuation** — Finish Soon, Continue Watching. What else
   matters to *this* user right now, derived from their own watch
   history. Renders for Balanced/Personal layouts only — see "Home
   layout and composition" below.
3. **Public/current discovery** — Trending movies/shows, In theaters,
   Popular movies/shows. What's timely in the wider media world.
4. **Personal release intelligence** — a Home-specific presentation of
   Calendar's own domain (new/upcoming episodes, season premieres,
   planned movie releases). How much of this shows, if any, is the other
   thing Home layout controls — see below and docs/calendar.md, "Home
   integration".

Personal content renders above public content whenever it exists. When
none of it does (a brand-new user, or a user fully caught up on
everything, with Up Next off or empty), nothing personal renders at all —
whatever the current layout shows next simply starts at the top of the
page. There is no empty "Up Next" card, no "start watching something"
prompt. See `features/home/personalized-home-sections.tsx`.

## Up Next is a separate preference

Up Next used to be entangled with the old "Home focus" concept; it is now
governed by its own independent, durable preference (`showUpNext`,
`user_preferences.show_up_next`, default **on**) — see docs/settings.md,
"Home layout and Show Up Next". `homeLayout` never encodes Up Next as
part of a layout variant (`resolveHomeLayout`'s `HomeComposition` type has
no `showUpNext`/`upNext` field at all, and a test asserts this directly —
see `layout.test.ts`); the two preferences are composed together only at
render time, in `PersonalizedHomeSections`
(`features/home/personalized-home-sections.tsx`):

- `showUpNext` decides whether the Up Next card renders, in every layout.
- `layout.showContinuationRows` (from `resolveHomeLayout` — true for
  Balanced/Personal, false for Calendar) decides whether Finish Soon/
  Continue Watching render below it.

Both preferences read from the exact same `getPersonalHome()`
classification — turning Up Next off never changes *which* show is "the"
Up Next candidate, only whether it's shown as the dedicated hero card.
When it's off (or there's genuinely no eligible show), that show is
folded into the front of Continue Watching instead of simply vanishing
from Home — the layout body becomes "the first Home content" as the
preference promises, without silently losing a real personal title. This
folding only applies when `showContinuationRows` is true; Calendar's body
never shows Continue Watching regardless of `showUpNext`.

Conceptually, with Up Next on:

```
Balanced:  Up Next → Balanced content
Personal:  Up Next → Personal content
Calendar:  Up Next → Calendar content only
```

With Up Next off, each layout's own content simply becomes the first
thing on the page — no `calendarWithUpNext`-style variant is ever needed.

## Home layout and composition

`resolveHomeLayout(layout)` (`server/home/layout.ts`, pure) decides what
fills Home *below* Up Next — three layouts with genuinely different
compositions, not a shared set of rows in different orders (see
CLAUDE.md, "Home layout changes composition and hierarchy meaningfully;
it is not merely cosmetic row ordering"):

- **Balanced** (default) — Finish Soon/Continue Watching, two public
  discovery sections (Trending movies/shows), plus a small, header-less
  calendar teaser (`buildHomeCalendarPreview`, capped at
  `HOME_CALENDAR_PREVIEW_LIMIT`) — a curated mix where no one category
  dominates.
- **Personal** — Finish Soon/Continue Watching, a Backlog row
  (`features/home/backlog-row.tsx`, `server/home/backlog.ts`) surfacing
  the user's own saved Backlog titles, one public discovery section (down
  from Balanced's two — never zero), and no calendar content at all. This
  is "My MEDIO."
- **Calendar** — the Calendar body *only* — no Continue Watching, no
  Backlog row, zero public discovery sections. Discover already owns
  broad browsing, so no Home layout duplicates it (see CLAUDE.md,
  "Discovery is a dedicated product destination and should not be
  duplicated as a Home-layout option"). Which of Calendar's own two
  layouts that body actually is — the Today/This week/Later agenda
  (`features/home/home-calendar-agenda.tsx`) or the full month grid
  (`features/home/home-calendar-month.tsx`, reusing `CalendarMonthView`
  unchanged) — is its own separate preference, `homeCalendarView`
  (default **calendar**, i.e. the full grid): see docs/settings.md, "Home
  layout and Show Up Next".

The agenda body (and Balanced's smaller teaser) never compute their own
release eligibility — both call the exact same `getCalendarEvents`/
`buildReleaseTimeline` composition Calendar's own page uses, then only
re-bucket/cap that already-decided, already-ranked output
(`server/home/calendar-agenda.ts`). "Today" folds in Calendar's
"Recently released" (both answer "what's new right now" on Home); "This
week" folds in "Tomorrow"; "Later" is capped
(`HOME_CALENDAR_LATER_LIMIT`), never Calendar's full 90-day horizon —
Home's header `CalendarEntryPoint` remains the one constant way into the
real page. The full-grid body reuses `CalendarMonthView` entirely unchanged, always
showing the current month: Home never grows its own `?month=`
navigation state, so the grid's own month-navigation chevrons/Today link
hand off to the real `/calendar?view=calendar` page rather than adding a
second month-navigable surface. See docs/calendar.md, "Home integration".

The Backlog row reuses Planning's existing `listPlanningItems` read,
filtered to `backlog` intent only (never `watchlist` — Backlog is the
stronger "I intend to watch this" signal; see CLAUDE.md, "Library"), the
same "fetch broadly, filter downstream" convention
`server/calendar/candidates.ts` already establishes, rather than a new
intent-filtered query function.

## Definitions

- **Up Next** — the single strongest next episode to continue: the most
  recently active eligible show's canonical next unwatched, aired,
  regular episode. Never a future/unaired episode, never TMDB's "next
  episode to air," never a Watchlist/Backlog item, never taste-based.
- **Continue Watching** — every other eligible active show, most
  recently active first. Never includes the Up Next show or any Finish
  Soon show.
- **Finish Soon** — active shows with very little unwatched aired content
  left (`FINISH_SOON_MAX_REMAINING_EPISODES` = 3 —
  `server/home/constants.ts`). A small nudge, not urgency marketing: no
  countdown, no "Almost there!", just "N episodes left."

All three are TV/episode-driven only. Movie tracking represents completed
viewings, not playback progress, so movies never appear in these
sections — see docs/tracking.md.

## Eligibility

A show is a personalization candidate only when:

- it has an explicit `watching` status (`on_hold`/`dropped` are excluded
  at the SQL level — `listWatchingShows`, never fetched or hydrated at
  all for those shows)
- its derived viewing state resolves to `watching` (not `caught_up`,
  `waiting`, `unwatched`, or `completed` — see docs/tracking.md)
- it has a real next unwatched, aired, regular episode (Specials excluded,
  same rule as everywhere else in this application)

Caught Up/Waiting/Completed shows have nothing currently available to
continue and never produce a fake continuation item — they remain
reachable through Library.

## Ranking and rewatch activity

Candidates are ordered by `show_tracking_state.updated_at` — bumped on
every explicit state change *and* on every recorded episode watch
(including rewatches of older episodes; see `episode-events.ts`). A
rewatch is legitimate recent activity and can make a show "most recently
active" again, but the *suggested* next episode is always the canonical
next unwatched one (`ShowProgress.nextUnwatchedEpisode`), never the
episode that was just rewatched.

## Deduplication

Precedence is strict and enforced in one place
(`server/home/classify.ts`, a pure function):

1. the most recently active eligible candidate becomes **Up Next**
2. of the rest, ones at or under the Finish Soon threshold become
   **Finish Soon**
3. everything else becomes **Continue Watching**

A show can never appear in more than one bucket. When there's only one
eligible show, it renders as Up Next alone — never a duplicate one-item
Continue Watching row underneath it.

## Read model

`server/home/queries.ts`'s `getPersonalHome()` is the one reusable read —
candidate-first:

1. cheaply query private state for a bounded, most-recently-active set of
   `watching` shows (`HOME_ACTIVE_SHOW_CANDIDATE_LIMIT` = 8 —
   `server/home/constants.ts`)
2. hydrate *only* those candidates with provider metadata and exact
   per-episode progress (`server/shows/show-episode-progress.ts` — the
   same per-show season-fetch logic Show Details uses, shared rather than
   duplicated)
3. classify into Up Next / Finish Soon / Continue Watching
   (`classifyActiveShows`)

Returns `PersonalHome` (`upNext`, `finishSoon`, `continueWatching`), built
from `ActiveShowContinuation` — one shape shared by all three buckets
(they're the same kind of fact, just sorted differently), never a raw DB
row or TMDB DTO. No new persistence exists for any of this — Up
Next/Continue Watching/Finish Soon are pure projections derived at read
time from watch events, `show_tracking_state`, and normalized provider
metadata, exactly like `caught_up`/`waiting`/`completed` already are.

## Provider fan-out

The one deliberate per-show N-season fetch this application allows (see
docs/architecture.md) is now shared by two callers — Show Details and
Home — via `getShowEpisodeProgress`, instead of a second copy of that
logic. Home bounds its blast radius by candidate count (step 1 above):
never every season of every show the user has ever tracked, only the
handful of most-recently-active ones. One hydration failure for one
candidate is swallowed and that candidate is simply omitted — it never
breaks the rest of personalized Home, and the user's tracking data is
never touched because of it.

## Spoiler safety

Up Next shows the show's own poster/backdrop, never the next episode's
still image or overview — an unwatched episode's plot is never revealed.
The episode title is shown (standard metadata, same as everywhere else in
the app), but nothing more specific.

## No fake playback

This application tracks media; it doesn't stream it. Up Next's primary
action is "Open episode" (a real link to
`/shows/[id]/seasons/[seasonNumber]#episode-[episodeNumber]`), never
"Play"/"Resume"/"Watch now," and there is no playback progress bar.

## Tracking actions from Home

Show Details/Season page controls reuse the exact same
`markEpisodeWatchedAction` every other episode-watch control calls, which
revalidates `/` in addition to the show/season pages it already
revalidated — so marking an episode there keeps personalized Home in sync
without a hard reload.

Up Next's own "Mark watched" is deliberately different — see "Up Next
Undo" below for why it doesn't use that shared action.

## Up Next Undo

Marking Up Next's episode watched calls `markUpNextEpisodeWatchedAction`
(`features/home/up-next-actions.ts`), not the shared
`markEpisodeWatchedAction` — it invokes the identical underlying
`recordEpisodeWatch` domain command (the event is written immediately,
same as everywhere else) but deliberately skips `revalidatePath("/")`.
Revalidating immediately would replace the card the user is looking at
(episode, show, and any Undo affordance on it) with whatever Up Next
becomes next before they have a real chance to correct a misclick.

Instead, `UpNextMarkWatchedButton` holds the card in a "Watched · Undo"
confirmation for a few seconds. Undo calls
`undoUpNextEpisodeWatchedAction`, which deletes exactly the event just
created (episode tracking is a plain toggle — see `docs/tracking.md` —
so there is never more than one event to disambiguate). If the window
closes without Undo, the component calls `router.refresh()` itself,
which is what actually reveals the real next Up Next state. Either way,
the database write is immediate and never faked; only the client's own
re-render is deliberately deferred.

Keyboard focus follows both transitions explicitly (mark-watched →
Undo, and Undo → mark-watched again) — see the component's own comment.

## Privacy / caching

`getPersonalHome()` reads the authenticated session, so `/` is inherently
per-request/dynamic — never statically generated, never eligible for
shared/public caching. TMDB's own responses used to hydrate candidates
may still use Next's normal public fetch caching; that stays a separate,
provider-owned concern from the private personalization wrapping it.

## What this phase deliberately does not include

Tonight, My Queue, a Watchlist Home section (Personal layout's row is
Backlog only — see "Home layout and composition"), a taste-based
recommendation engine, Movies in Continue Watching, or persisted derived
Home categories/compositions (`homeLayout`/`showUpNext` are themselves
durable preferences, but every section they turn on is still computed
fresh at read time, same as Up Next/Continue Watching).
