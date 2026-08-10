# Pick for Me (Recommendations)

Pick for Me (`/pick`, `src/server/pick/`, `src/features/pick/`) is MEDIO's
decision engine — the answer to "what should I watch tonight?" It is
deliberately **not** a feed, a carousel, a dashboard, a chatbot, a filter
page, or a randomizer. Its one success metric is how quickly a user can
confidently choose something to watch. See CLAUDE.md, "Pick for Me" for the
durable rules this file expands on.

## Purpose and shape

Every call to `getPickRecommendations` (`compose.ts`) returns at most one
**Best Pick** plus up to `PICK_ALTERNATIVE_COUNT` (2) **Alternatives** —
three recommendations total, never a scrollable list underneath. Fewer,
better recommendations beat more, weaker ones.

## Candidate families

Four kinds of candidate, each a distinct fact (see `types.ts`,
`PickCandidate` — a discriminated union, not one shape with optional
fields):

- **Continue** (`continueEpisode`) — the next aired, unwatched episode of
  an active show. Sourced entirely from Home's own `getPersonalHome()` —
  see "Continue pool" below.
- **Finish** — not a separate kind; a `continueEpisode` candidate with
  `isFinishSoon: true`, already classified by Home's `classifyActiveShows`.
- **Start Saved** (`savedMovie` / `savedShow`) — a Backlog or Watchlist
  item, hydrated from `server/planning/`.
- **Discover** (`discoveryMovie` / `discoveryShow`) — a fresh, taste-
  evidenced title the user has no existing relationship with.

Pick does not over-optimize for Discovery. An active show with one
episode left, or a good Backlog movie, regularly and correctly beats a
brand-new discovery pick — see "Scoring model" below.

## Continue pool

`candidates-continue.ts` reuses `getPersonalHome()` wholesale rather than
re-deriving next-episode eligibility. Home's own `classifyActiveShows`
already correctly excludes On Hold, Dropped, Completed, and
Waiting/Caught-Up-with-no-aired-next shows (see `docs/home.md`) — Pick
never duplicates that logic. Up Next, Finish Soon, and Continue Watching
are simply re-labeled as candidates.

## Eligibility

`eligibility.ts` is pure, no I/O. A candidate's **format** (Movie/Show)
never gets silently relaxed — "Movies only" always means only movies.
Only the **time budget** is ever automatically loosened, and only after
producing zero eligible results (see "Constraint relaxation" below).

## Time presets

Three named, human-friendly presets (`server/pick/constants.ts`) — never
a raw minute slider:

| Label           | Threshold (minutes)              |
| --------------- | --------------------------------- |
| Quick            | `TIME_BUDGET_QUICK_MINUTES` (35)  |
| About an hour    | `TIME_BUDGET_HOUR_MINUTES` (65)   |
| Movie night      | `TIME_BUDGET_MOVIE_NIGHT_MINUTES` (150) |

Under the strict "Quick" tier only, a candidate with unknown runtime is
excluded outright — claiming an unknown-length title fits a ~35-minute
window would be a false claim. Under the two longer tiers, or under "any
length", an unknown-runtime candidate stays eligible; it simply never
earns the `timeFit` bonus (see "Scoring model").

## Scoring model

`scoring.ts` is pure and deterministic. Every number the engine uses is a
named constant in `constants.ts`, never a magic number inline. Base
scores by kind, highest first:

1. `CONTINUE_BASE_SCORE` (+`FINISH_SOON_BONUS` if applicable)
2. `BACKLOG_BASE_SCORE`
3. `WATCHLIST_BASE_SCORE`
4. `DISCOVERY_BASE_SCORE` (+`RECOMMENDATION_SOURCE_BONUS` /
   `DIRECTOR_AFFINITY_BONUS` depending on source)

This ordering is deliberate: existing intent (an active show, a saved
title) always outranks a fresh Discovery pick before any modifier is even
considered. Backlog outranks Watchlist — a stronger stated intent to
watch. Modifiers (`GENRE_AFFINITY_BONUS`, `TIME_FIT_BONUS`,
`RECENT_CONTINUATION_BONUS`, ...) never invert this base ordering; they
only break ties within a kind or nudge a close call.

## Reason facts

A recommendation's "why this?" is a list of structured `ReasonFact`
values (`types.ts`) — never a raw string built inside the scorer. The
domain layer only ever emits facts; `features/pick/reason-copy.ts` is the
single place that converts a fact into display copy, mirroring the
existing `diary-ordinal.ts` precedent. This keeps every reason testably
true (a test can assert the fact was produced, not just that some string
appeared) and keeps wording changes to one file.

### Reason truthfulness

Every reason must be backed by real evidence, not vibes:

- `highGenreAffinity` / `directorAffinity` only ever come from
  `taste-summary.ts`, which reuses Stats' own confidence-aware
  `computeGenreInsights` / `computeFavoriteDirectors` (see "Why not reuse
  Stats directly" below) — the same minimum-sample-size thresholds Stats
  already enforces, never a looser Pick-specific bar.
- `recentContinuation` only fires when a show's last watch activity falls
  within `RECENT_CONTINUATION_MAX_DAYS` (2) of "now" — see
  `scoring.ts`'s `recentContinuationBonus`. A `daysAgo` of 5 never
  produces "you watched this recently."
- Actor affinity is deliberately **not implemented** in this pass — the
  spec frames it as an optional, very weak, cautious tie-breaker; adding
  it would require a new discovery source (cast credits), a new
  confidence computation, and a new reason fact for a signal explicitly
  documented as marginal. Revisit only with a concrete product need.
- No reason ever states or implies a numeric match percentage (e.g.
  never "97% match") — `reason-copy.test.ts` asserts this directly.

## Backlog vs. Watchlist vs. Discovery

Backlog means a stronger stated intent to watch than Watchlist — reflected
directly in `BACKLOG_BASE_SCORE > WATCHLIST_BASE_SCORE`. A suitable
Backlog title is usually preferred over recommending yet another new
movie; Discovery has to earn its place through taste-affinity bonuses, a
recommendation-source bonus, or the complete absence of a better local
candidate. MEDIO should never worsen backlog paralysis by defaulting to
"something new" when a good saved title is sitting right there.

## Discovery candidate generation

`candidates-discovery.ts` never ranks the whole TMDB catalog. It gathers
a small number of seeds (3–5 top-rated titles via
`PICK_TASTE_SEED_MOVIE_LIMIT` / `PICK_TASTE_SEED_SHOW_LIMIT`, plus the
user's favorite director's filmography when confident), merges and
dedupes across sources (`mergeRaw`, first-seen source wins), and only
then hydrates full details for the bounded, exclusion-filtered result
(`PICK_DISCOVERY_RAW_CANDIDATE_LIMIT`). A user with no rating history
falls back honestly to `getPopularMovies`/`getPopularShows` — the
`popular` source, whose reason copy ("Popular right now") never claims
personalization it doesn't have (see "New user fallback").

### Discovery candidate exclusion

Two exclusion passes, in order: (1) titles the user already has a
relationship with — saved (Watchlist/Backlog) or an actively-continuing
show — are excluded before a single provider request is made; (2) titles
already in the user's real watch history
(`getWatchedMovieIds`/`getKnownShowIds`) are excluded after gathering,
since that check needs the specific candidate IDs a source produced.
Provider-suggested titles the user has already watched (e.g. TMDB
recommending a sequel they've seen) are excluded exactly the same way.

### Director discovery

Only implemented for movies (`getPersonCombinedCredits`, filtered to
`job === "Director"`). Show discovery has no equivalent — TMDB's combined
credits endpoint models film directing credit far more cleanly than
show-level "creator" credit, and there is no confident current signal
for "this person directed episodes you'd recognize." See "Deferred:
actor/director discovery for shows" below.

### Deferred: actor/director discovery for shows

Not implemented. `DiscoveryShowCandidate.source` deliberately excludes
`"director"` at the type level (`Exclude<DiscoverySource, "director">`)
to keep this honest rather than silently unreachable. Revisit only if a
real, confident per-show creator/showrunner affinity signal exists.

### New user fallback

A brand-new account (no ratings, no Watchlist/Backlog, no active shows)
still gets a working, honestly-labeled experience:
`hasEnoughDataForPersonalization` is `false`, Discovery falls back to
`popular`, and every resulting reason is `popularDiscovery` — never a
fabricated "Based on your taste."

## Why not reuse Stats directly

`taste-summary.ts` deliberately calls Stats' pure `computeGenreInsights` /
`computeFavoriteDirectors` functions directly rather than calling
`getStatsProfile()` wholesale. `RecommendationTasteSummary` is a much
smaller, Pick-specific projection (genre affinities split by media type,
one favorite director, a handful of seed titles) — reusing the *pure
computation* inherits Stats' already-correct confidence thresholds
without inheriting Stats' full analytical surface area (favorite
actors, viewing-time estimates, etc.) that Pick has no use for.

## Session-only context

`DecisionContext` (Format/Time), the "Not now"/"Another Pick" exclusion
set, and the variety seed are all pure client state — **never
persisted**, never written to the database. They're threaded back into
`getPickRecommendations` on every call by the one client boundary
(`features/pick/pick-experience.tsx`) via the one Server Action
(`refreshPickAction`). "Not now" is a session-only hide, never a dislike,
never Dropped, never any kind of permanent feedback signal.

## URL state

Format and Time are URL-addressable (`?format=`/`?time=`, see
`features/pick/pick-params.ts`) — this gives refresh, deep-linking (e.g.
a future "Quick watch" link elsewhere in the app), and test-friendliness
for two lightweight, genuinely shareable dimensions. The session-only
exclusion set and the variety seed deliberately never appear in the URL —
neither is meaningful to a shared link, and putting session/random state
in a URL invites confusing, stale-feeling deep links.

## Constraint relaxation

Relaxation order is **time-first, format-never**. If the strict context
(format + time) produces zero eligible candidates, and a time budget was
set, `relaxTimeConstraint` clears only the time budget and eligibility is
recomputed. `PickResult.relaxedTimeConstraint` is `true` only when this
actually happened, and the UI must say so ("we widened the search") —
Pick never silently substitutes a result for a different constraint than
what was asked for. Format is never relaxed automatically: "Movies only"
with no fitting movie shows an honest empty state with an explicit
"Relax time" affordance, not a silently-substituted show.

## Diversity pass

`selection.ts`'s alternative-selection loop prefers a candidate of a
`kind` not already chosen, but only when one exists within
`DIVERSITY_SCORE_BAND` (0.85) of the best remaining score, searched
within `DIVERSITY_LOOKAHEAD` (4) candidates. Otherwise the next-best
candidate is taken regardless of repeated kind — one category
legitimately dominating (e.g. three strong active shows and nothing else
close) is a real, honest outcome the selection never forces itself away
from with an artificial quota.

## Controlled variety

Pure determinism (the same #1 pick forever) reads as stale; pure
randomness would occasionally let a meaningfully weaker candidate win,
destroying trust in "why this?" `selectPrimaryIndex` (`selection.ts`)
only ever rotates the **primary** slot among the leading candidates
within `PRIMARY_VARIETY_SCORE_BAND` (0.95) of the top score, capped to
`PRIMARY_VARIETY_POOL_SIZE` (3) candidates — a candidate outside that
band can never become primary no matter the seed.

`varietySeed` defaults to `0`, which always resolves to index `0` (today's
exact "highest scorer wins" behavior) — every caller that doesn't pass a
seed, including every existing test, is unaffected. A real page request
(`app/(app)/pick/page.tsx`) generates a fresh random seed per request and
threads it through `PickExperience` for the rest of that browser session,
so rotation happens across separate visits/reloads, not on every click —
this is never persisted, same as the rest of session context.

## Determinism

Given the same candidate pool, context, taste summary, `now`, and variety
seed, `scoreCandidate` → `selectPicks` always produces the same result.
All randomness in the system is confined to the one explicit
`varietySeed` input; nothing reaches for `Math.random()` inside the
scoring/selection domain itself.

## Session behavior

A Pick session (all client-side, `pick-experience.tsx`) remembers: the
current `DecisionContext`, the session exclusion set, and the variety
seed. "Another Pick" excludes the current primary and re-runs the engine,
promoting the next strong candidate — the same candidate never
immediately reappears. "Not now" on an alternative does the same for that
one card. Changing Format or Time re-runs the engine with a genuinely new
context (never a client-side filter of the existing result, since a
changed context can surface candidates the client never fetched) and
syncs the URL.

## Actions

Never more than two actions per recommendation, and the action always
matches what kind of fact the candidate represents (`pick-card.tsx`):

| Candidate kind      | Primary action                          | Secondary       |
| -------------------- | ---------------------------------------- | ---------------- |
| `continueEpisode`    | Mark watched (the specific next episode) | Another Pick / Not now |
| `savedMovie`         | Mark watched                             | Another Pick / Not now |
| `savedShow`          | Start watching                           | Another Pick / Not now |
| `discoveryMovie/Show`| Save (`PlanningControl`, respects Default Save Destination) | Another Pick / Not now |

Every action reuses the exact Server Action the rest of the app already
uses for that mutation (`markEpisodeWatchedAction`,
`markMovieWatchedAction`, `startWatchingShowAction`,
`changePlanningIntentAction`) — Pick never invents a bespoke mutation.
After a quick action commits, Pick recomputes from the changed
server-side state (`onTracked` → `refresh`) rather than patching local
state, the same "derived, never a stale copy" discipline Tracking,
Library, and Diary already follow.

## Performance architecture

Staged evaluation, cheapest first:

1. Fetch cheap, already-computed local context: `getPersonalHome()` for
   Continue, `listPlanningItems` for Saved, taste summary for scoring
   inputs — all parallelized (`Promise.all`).
2. Filter that local pool for eligibility under the current context.
3. **Skip Discovery entirely** when the local pool already has enough
   eligible candidates to fill the full result (`1 +
   PICK_ALTERNATIVE_COUNT`) — Discovery is the one step that costs real
   provider hydration, and existing intent already outranks it at the
   base-score level, so it could only ever have won a diversity slot.
   This is a deliberate, desirable skip, not a missed opportunity.
4. Only when Discovery is genuinely needed: gather bounded raw IDs across
   a handful of seeds, merge/dedupe, exclude known states, cap the count,
   *then* hydrate full details for the survivors — the expensive
   per-title fetch only ever runs on the final bounded set.
5. Score and select from whatever candidates were actually gathered.

## Candidate caps

Every unbounded-sounding fetch has an explicit, documented ceiling in
`constants.ts`: `PICK_SAVED_CANDIDATE_LIMIT` (20), `
PICK_DISCOVERY_PER_SOURCE_LIMIT` (8), `PICK_DISCOVERY_RAW_CANDIDATE_LIMIT`
(12), `PICK_TASTE_HYDRATION_LIMIT` (60). None of these grow unbounded with
account age or history size.

## Cache and privacy

Public provider metadata (movie/show details, discovery pages) may use
TMDB's existing shared/public caching. The final personalized
recommendation result — the ranked, scored, session-aware output of
`getPickRecommendations` — is always user-private and is **never**
shared-cached, the same rule as Tracking/Library/Diary/Stats/Calendar.

## Constraint failure

"Movie" + "Quick" with no Movie fitting a ~35 minute window does **not**
silently switch to a Show, and does not silently widen the time budget
without saying so. The empty state names the constraint clearly ("no
strong Movie fits a quick watch") and time may only be relaxed with
explicit user awareness (`relaxedTimeConstraint`) — format is never
relaxed automatically under any circumstance.

## Streaming availability is not a signal

Pick has no notion of "My Services," streaming-provider availability, or
any per-service ranking boost. This was audited via an explicit search
(`onMyServices`, `myServices`, `streamingServices`, `onmyservice`, etc.)
across `src/`, `docs/`, and `CLAUDE.md` and confirmed absent. If a future
Where-to-Watch feature is added elsewhere in the product, it must not
leak into Pick's candidate generation or scoring without a deliberate,
separately-reviewed product decision — private notes, mood inference, and
collaborative filtering are excluded from ranking for the same reason:
none of them are grounded, testable evidence a reason can honestly cite.
