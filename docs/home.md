# Home

Home is the primary personal decision surface: *"what makes sense for me
to watch next?"* This document covers the personalization layer; see
`docs/tracking.md` for the tracking domain it derives from and
`docs/library.md` for the related (but distinct) personal-media surface.

## Home's two layers

1. **Personal viewing** — Up Next, Finish Soon, Continue Watching. What
   matters to *this* user right now, derived from their own watch
   history.
2. **Public/current discovery** — Trending movies/shows, In theaters,
   Popular movies/shows. What's timely in the wider media world.

Personal content renders above public content whenever it exists. When it
doesn't (a brand-new user, or a user fully caught up on everything),
nothing personal renders at all — public sections simply start at the top
of the page. There is no empty "Up Next" card, no "start watching
something" prompt. See `features/home/personalized-home-sections.tsx`.

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

Tonight, My Queue, Watchlist/Backlog Home sections, a taste-based
recommendation engine, Movies in Continue Watching, a "Waiting for"/
release-calendar section, or persisted derived Home categories.
