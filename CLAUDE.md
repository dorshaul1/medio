# CLAUDE.md

Guidance for Claude Code when working in this repository. Keep it current —
if architecture genuinely changes, update this file and `docs/architecture.md`
in the same change.

## Engineering

- Inspect existing patterns before changing architecture. Match what's there.
- Use pnpm exclusively. Never `npm` or `yarn`, never commit another lockfile.
- Maintain strict TypeScript. Never use `any`. Prefer `unknown` at untrusted
  boundaries and narrow it explicitly.
- Never use `@ts-ignore`. Avoid `@ts-expect-error`. Avoid non-null assertions
  (`!`) and unsafe type assertions (`as`) — fix the type instead.
- Never weaken `tsconfig.json`, Biome rules, or other quality gates just to
  silence an error. Fix the underlying issue.
- Prefer explicit, readable code over clever code. Prefer inference where it
  keeps code readable; explicitly type public/module boundaries.
- Avoid speculative abstractions. Don't add a layer, wrapper, or config option
  before there is a real second use case for it.
- Don't add a dependency without a clear, current need. Prefer a platform or
  framework API before reaching for a package.
- Keep modules small and focused. No `helpers.ts` / `utils.ts` / `common/`
  dumping grounds — a util belongs in `lib/` only if it's genuinely generic.
- No `T`-prefixed types, no `I`-prefixed interfaces. Use clear domain names.

## Next.js / React

- Server Components are the default. Add `"use client"` only when something
  genuinely requires state, event handlers, browser APIs, effects, or a
  client-only dependency.
- Keep client boundaries narrow — push `"use client"` as far down the tree as
  possible, never on a whole layout or page for convenience.
- Don't create internal API routes for code that can be called directly on
  the server (a Server Component or Server Action). An API route needs a real
  HTTP boundary (external caller, webhook, etc.) to justify it.
- Keep secrets server-side. Only `NEXT_PUBLIC_`-prefixed values may reach the
  browser, and that prefix is a deliberate choice, not a default.
- Prefer framework capabilities before adding abstractions on top of them.

## Architecture

- Keep feature logic near the feature that owns it (see `docs/architecture.md`
  for current directory ownership).
- External systems (database, auth, media providers, etc.) must live behind
  explicit server-side integration boundaries — never imported directly into
  UI or domain code.
- Do not opportunistically implement future phases. If a task is scoped to
  one phase, stop at that phase's boundary even if the next step seems obvious.

## Quality

- Preserve accessibility (semantic HTML, labels, keyboard behavior, contrast).
- Preserve responsive behavior.
- Run the relevant quality commands before calling work done: `pnpm check`
  (format check + lint + typecheck + unit/component tests) at minimum;
  `pnpm build` for anything touching routing, config, or dependencies;
  `pnpm test:e2e` for anything touching a real user-facing flow.
- Never claim a check passed unless it was actually run in this session.
- Update `docs/architecture.md` when architecture genuinely changes — not
  preemptively, not for cosmetic edits.

## Testing

- Write tests for meaningful behavior — public contracts, important
  transformations, accessibility-visible UI, routing/framework boundaries.
  Not `expect(true).toBe(true)`, not tests that just mirror the implementation.
- Prefer Testing Library's accessible queries (role, label, text) over CSS
  selectors or `data-testid`.
- Avoid snapshot tests unless there's a rare, genuinely compelling case.
- Never use arbitrary sleeps or timeouts to paper over a flaky test — find the
  race and fix the architecture or the test's wait condition instead.
- Do not convert a Server Component to a Client Component merely to make it
  easier to unit test. If it can't be tested without that, test it with
  Playwright instead.
- Use Playwright (`e2e/`) for flows that need the real app running; use
  Vitest (colocated `*.test.ts(x)`) for everything else.
- Mock only at real boundaries (e.g. a future external API), not internal
  application code.
- Run the tests relevant to a change before calling it done; never claim a
  test suite passed without actually running it.
- When fixing a bug with a stable, reproducible case, add a regression test
  if it provides meaningful protection.

## Visual system

- Never accept default shadcn/Radix styling as final product UI — start
  from it for accessibility/interaction behavior, then own and redesign the
  visual layer. If a piece of UI could belong unchanged to a generic SaaS
  dashboard/CRM, refine it.
- Use semantic design tokens (`bg-background`, `text-muted-foreground`,
  `border-border`, ...) from `src/app/globals.css` — never scatter raw
  colors through components. See `docs/design-system.md`.
- Preserve "Content brings the color": UI chrome stays neutral; pastel
  accent tokens are for sparing fills/indicators, never large backgrounds
  or text color.
- Clay (`primary`/`primary-*`) is the product's one signature brand accent —
  a muted terracotta, deliberately distinct from `destructive` (red) and
  `warning` (amber). Use it for primary actions, intentional selection, and
  focus; never for body text, page titles, every icon/badge, or navigation
  chrome beyond one restrained detail. Always use the semantic tokens
  (`bg-primary`, `bg-primary-hover`, ...), never a raw palette value. Don't
  confuse it with `positive` status (`pastel-sage`, a separate token).
- Dark mode is neutral charcoal, not navy/purple-tinted, and authored
  independently — never just an inverted light theme.
- Composition before containers: reach for typography, whitespace, and
  grouping before a card/border/shadow. A card is not the default content
  wrapper. Earn every border, radius, shadow, icon, and badge.
- Prefer restrained font weights (`font-medium` over `font-semibold`) —
  hierarchy comes from size + weight + spacing together, not bolding
  everything that needs emphasis.
- Avoid excessive pills/rounded containers, decorative gradients,
  glassmorphism, neon, and generic `hover:scale`/`transition-all`. Animate
  specific properties; respect `prefers-reduced-motion`.
- Check `src/components/ui/` and `/design-system` (local dev only) before
  creating a new primitive or duplicating markup that already exists there.
  A new shadcn/Radix primitive is added only when a real screen needs it,
  then redesigned the same way the existing set was — every public
  primitive should get a `/design-system` entry.
- New component variants require a real product need — don't grow a
  primitive's API speculatively. Product-specific UI should fit its actual
  context rather than become a universal prop-heavy abstraction.
- Preserve accessible focus states (the `focus-visible:ring` treatment) and
  complete interaction states (hover/focus/disabled/etc., whichever apply)
  on any new interactive element. Icon-only controls need a real accessible
  name — prefer `IconButton`, which requires one.
- Remove unnecessary explanatory copy — don't write filler text to fill
  empty space.
- Don't build product UI while doing infrastructure/design-system work —
  keep phases scoped (see Architecture above).

## Application shell

- Primary navigation is Home, Discover, Library, and Stats — don't add a
  destination without a real product need, and don't build future feature
  navigation speculatively.
- `src/config/navigation.ts` is the single source of truth for nav
  destinations (href/label/icon) and active-route matching; desktop and
  mobile nav both read from it rather than duplicating entries.
- Keep navigation visually restrained: icon + label, a subtle active state
  (not a saturated background or a glowing pill).
- Desktop uses a compact persistent side rail; mobile uses a bottom bar with
  the primary destinations only, while that list stays short. One
  breakpoint (`md`) decides which renders.
- Use `aria-current="page"` for the active destination — never signal
  active state with color/weight alone.
- `DesktopNav`/`MobileNav` are Client Components only because they need
  `usePathname()`; don't make `AppShell` or page content client for this.
- Don't add sidebar-collapse behavior or a command palette without a real
  requirement. The account control (`AccountControl`) is real (name/email +
  sign out) — keep it that small; don't grow it into an avatar/dropdown
  profile system without a real requirement.

## Database

- PostgreSQL is the application database; Drizzle (`node-postgres` driver)
  is the only query layer — see `docs/database.md`.
- Database code stays server-only (`src/server/db/`, `server-only` import).
  Never import it from a Client Component.
- Never expose `DATABASE_URL` — no logging it, no leaking it in errors.
- Never query the database during module initialization (importing the db
  module must not execute a query).
- Schema changes go through migrations (edit schema → `db:generate` →
  review the SQL → commit → `db:migrate`). Never `db:push` as the normal
  workflow; never mutate a production schema automatically on app boot.
- Use `timestamptz` for real moments in time; add indexes based on actual
  access patterns, not preemptively; use real database constraints for
  genuine invariants.
- No generic repository/DAO layer over Drizzle — domain query functions
  live near the feature that owns them.
- Our database owns user-owned state (users, watch state, lists, etc.); it
  does not mirror an external media provider's full catalog.

## Authentication

- Better Auth owns authentication — don't build a parallel auth system.
- Session/user identity must come from validated server auth state
  (`getCurrentSession`/`requireSession` in `src/server/auth/session.ts`).
  Never trust a client-provided user ID (form field, query param, client
  state) as identity.
- Route-group protection (`(app)`'s layout redirecting to `/sign-in`) is a
  UX convenience, not authorization. Any server code that reads/writes
  user-owned data must validate the session itself at that point — see
  `docs/authentication.md`.
- Keep auth/database code server-only; never expose `BETTER_AUTH_SECRET` or
  a session token (no logging either).
- Use Better Auth's inferred types (session, user) — don't hand-duplicate them.
- Don't add auth plugins/providers (social login, MFA, etc.) without a real
  requirement — see `docs/authentication.md` for what's deliberately deferred.
- Don't add dead auth UI (a link/button for a feature that doesn't exist).
- Auth screens follow the same bespoke anti-template standard as the rest
  of the product — no centered card, no generic SaaS auth look.
- Reuse `src/components/ui/` primitives before creating auth-specific ones;
  if a primitive is missing something auth needs, fix the primitive.

## Media provider

- TMDB (`src/server/tmdb/`) is an external media provider, not our domain
  model — see `docs/media-provider.md`.
- Raw TMDB response types/field names must not escape the integration
  boundary; product/UI code only ever sees `src/server/media/` models.
- UI must never depend directly on TMDB field names (`poster_path`,
  `first_air_date`, ...).
- Keep TMDB credentials (`TMDB_API_TOKEN`) server-only.
- Use native `fetch` for TMDB — no HTTP client dependency.
- Validate external response fields we actually rely on (Zod); don't model
  fields we don't use.
- Map provider responses to application-owned media models via pure
  mapper functions — never pass a raw TMDB object upward.
- Do not mirror the TMDB catalog into PostgreSQL.
- TMDB's `vote_average` is `providerRating`, never `rating` — that name is
  reserved for a future personal/user rating.
- Do not add TMDB endpoints until a real product feature needs them.
- Live TMDB calls must never be required by normal unit/E2E tests or CI —
  `pnpm tmdb:check` is the explicit, separate live-connectivity check.
- TMDB requires attribution; watch-provider data (future) requires
  separate JustWatch attribution — see `docs/media-provider.md`.

## Media UI

- Home owns timely/current public media collections (Trending,
  Popular, In theaters) and, later, personal Continue Watching/Up Next
  content. Discover owns Search and intentional Movies/Shows genre
  exploration. Don't duplicate Home's sections inside Discover without a
  real product reason — see `docs/architecture.md`, "Home vs Discover".
- Movies and Shows are a mode inside Discover, not primary navigation
  destinations. Never mix movies and shows in one row/collection.
- Media presentation is context-specific — a browse tile
  (`MediaPoster`), a search result row, and a genre grid item are
  deliberately different compositions. Don't force one
  prop-heavy universal `MediaCard` to serve every context.
- Posters/artwork provide most of the visual color; don't wrap media
  items in generic Card UI (border/shadow/badge stack) by default.
- Missing artwork must be an intentionally designed, media-specific
  fallback — never a generic broken-image or "no image" placeholder.
- Search state, Discover's Movies/Shows mode, and genre-page sort/page
  must all be URL-addressable — never load-bearing-only in React state.
- Genre browsing derives from TMDB's real genre list (curated
  selection/ordering is fine) rather than a hardcoded slug→ID table —
  see `docs/media-provider.md`, "Genre discovery".
- `View all` opens a dedicated, media-type-specific genre browsing page
  (`/discover/movies|shows/genre/[genre]`) — never a full "browse
  everything" catalog bolted onto Discover's landing page.
- Real media UI must be visually reviewed — light, dark, and mobile, at
  real viewport sizes — as its own pass before considering the work done,
  not assumed correct from source alone. A computed style existing (e.g.
  a focus ring technically applying) isn't the same as it reading clearly
  against real artwork — verify by looking, not just by inspecting CSS.
  Mobile is reviewed as its own product surface, not a shrunk desktop.
- When a stronger UI solution requires it, redesign or replace existing
  product UI rather than incrementally patching it — don't optimize for a
  minimal diff, and don't keep a weak abstraction just because removing
  it touches call sites. Delete components/exports that a redesign makes
  dead; don't leave superseded implementations in the tree.

## TV / Show Details

- TV is hierarchical: Show → Season → Episode. Don't force Show Details
  into Movie Details' composition merely for code reuse — share the
  low-level artwork shell (`MediaDetailHero`) and truly generic pieces
  (`TrailerButton`, `CastMemberTile`), never the information hierarchy.
- Seasons are Show Details' primary product surface, not secondary
  metadata — never buried below Cast/recommendations.
- Season selection is URL-addressable (`/shows/[id]/seasons/[seasonNumber]`)
  — never local-React-state-only.
- Show Details must never eagerly fetch every season's episodes; the
  season page fetches only the one season the user opened.
- Season `0` represents Specials and is a valid, real season — handle it
  deliberately (sorts last, labeled by its own provider name, never
  hardcoded "Season 0"), never rejected or silently dropped if it has
  real episodes.
- TMDB's own show status (Returning Series/Ended/Canceled/...) and a
  personal watch status (Watching/Caught up/...) are different domains —
  never share a type or a persisted value; see "Tracking" below.
- Episode lists are non-interactive information objects until tracking UI
  lands (the domain exists — see "Tracking" below — but no product screen
  reads/writes it yet). Don't render dead controls ahead of that UI phase.
- TV product components belong to `features/shows/`, not `components/ui/`.

## People

- Actors, directors, and other intentionally surfaced People (e.g. show
  creators) must be navigable to `/people/[id]`. Don't leave some of them
  clickable and others plain text.
- Person pages prioritize professional identity and relevant Filmography
  over exhaustive personal metadata — no generic IMDb-style Personal Info
  sidebar of key/value rows.
- Do not expose raw provider Person/Credit DTOs to UI — map into
  `server/media/types.ts`'s `Person`/`PersonCastCredit`/`PersonCrewCredit`
  first, same boundary discipline as every other TMDB shape.
- Do not assume every Person is an actor. Professional hierarchy
  (Directing/Writing/Producing/Acting) must reflect actual credited work,
  not just default to an Acting-first layout.
- Directing work must be easy to identify for directors — its own
  section, not buried among producer/writer credits.
- Filmography may need Person-specific presentation (a dense row list,
  role/year context) rather than reusing Discover's poster cards
  unchanged — a career is being inspected, not browsed.
- Person/provider metadata remains external public data, same as a movie
  or show — never mirror People into PostgreSQL.
- Avoid fetching unused Person endpoints (image galleries, external/
  social IDs, People search) until a real product feature needs them.
- Long filmographies must remain performant and visually manageable — one
  bounded provider fetch, a capped initial render with "Show more," never
  per-credit additional requests or an uncontrolled page.

## Tracking

- Watch history is event-based; never replace it with `isWatched`.
  Multiple viewing events for the same movie/episode represent rewatches
  — never a manually maintained `rewatchCount`.
- Rewatches increase watch count but never unique-episode progress —
  dedupe by episode identity before counting progress.
- Movie and episode watch events are private, user-owned data — every
  mutation's `WHERE` clause enforces ownership directly; never trust an
  event ID alone, never accept a caller-supplied user ID.
- `watching`/`on_hold`/`dropped` are the only explicit, persisted Show
  Tracking statuses. Watchlist/Backlog are a separate planning domain
  (`server/planning/`) — never added to this enum. See "Library" below.
- `caught_up`/`waiting`/`completed` are derived at read time and must
  never be persisted as a stale status.
- Future/unaired episodes never count against current progress. Specials
  (season 0) never block normal show completion/caught-up progress, even
  though a watched Special is still real history.
- Recording a watch event must not require a live TMDB call — it only
  needs the normalized identity the caller already has.
- Never place tracking data in a shared/public cache; it's always
  request/user scoped, unlike TMDB's own cached responses.
- Product UI consumes tracking-domain models (`src/server/tracking/`),
  never raw DB rows, and never recomputes progress itself.
- Movie tracking is event-based, never a toggle: "Mark watched" always
  records another event; once watched, the control becomes "watch again";
  correction means removing a specific past event, never un-watching.
  Episode tracking is deliberately different — a plain watched/unwatched
  toggle, no rewatch count, no history menu, no "Undo". Don't unify the
  two without a real product reason.
- Never use success-green for "watched"/"completed" — it's normal viewing
  state, not a success alert. Never use destructive-red for "Dropped" or
  warning-amber for "On hold" — both are neutral personal classifications,
  not errors or warnings.
- Episode tracking controls must not resemble a task checklist — one
  compact control per row, never a checkbox column.
- A Season/Show page's episode tracking state is always one bulk fetch
  (`getSeasonEpisodeWatchSummaries`), never a query per episode.
- A movie/episode that hasn't been released/aired yet (see
  `features/media/has-released.ts`) must never offer a "mark watched"
  control — show a quiet "Not yet released"/"Upcoming" indication
  instead. Real watch history (e.g. an early screening) always takes
  priority over this if it's somehow already present.
- Resetting a show's progress (`resetShowWatchHistory`) is the one bulk
  watch-history deletion in the app, and it's the one tracking mutation
  that requires a confirmation step before running — every other
  tracking action commits immediately.

## Library

- Library is an application read model composed from planning + tracking
  + provider metadata (`server/library/`); it is not a single "library
  table" — see `docs/library.md`.
- Watchlist and Backlog are planning intents (`server/planning/`), never
  tracking statuses. Watchlist means lightweight saved interest; Backlog
  means stronger intent to watch.
- Starting/watching planned media clears its planning state (in the same
  transaction as the tracking write) without deleting any history.
- Derived Show states — Caught up/Waiting/Completed — must never be
  copied into Library (or any) persistence, same rule as Tracking above.
- Library UI must expose personal context (state, progress, planning
  intent) and must not simply reuse Discover's poster-grid cards
  unchanged.
- Avoid a giant all-state filter toolbar; expose only the raw, genuinely
  stored states relevant to the current media type filter. Derived states
  are never a pre-filter (see docs/library.md).
- Library metadata hydration fetches one `ShowDetails`/`MovieDetails` per
  visible title, never every season/episode of every visible show.
- Private Library data must never enter a shared/public cache — it's
  always request/user scoped, same as Tracking.
- Home's personalization layer (`server/home/`) reuses Library-adjacent
  lower-level pieces (`getShowEpisodeProgress`, the tracking domain)
  rather than duplicating raw DB access — but it is its own focused read
  model, not a caller of `getLibraryPage`: Library's progress is a
  deliberate Library-scale *approximation* (see docs/library.md), while
  Home needs the exact next-unwatched-episode identity Library doesn't
  compute. Shared lower-level projections are good; forcing one
  higher-level read model to serve both surfaces is not — see
  docs/home.md.

## Diary

- Diary (`/library/diary`) is a read model over `MovieWatchEvent` +
  `EpisodeWatchEvent` (`server/diary/`) — never create a Diary
  persistence table or duplicate/copy tracking events into one.
- Rewatches remain separate, independent events in the chronological
  history — never collapse them into a "watched N times" summary row
  inside the timeline itself (that summary belongs on Movie/Show
  Details).
- Cross-type Diary pagination (Movie + Episode events, two separate
  tables) must be globally stable — one keyset/cursor query
  (`(watched_at, event_type, id)`), never fetch-N-of-each-then-
  concatenate, which can't paginate correctly across two independently-
  ordered sources.
- Never calculate a rewatch's ordinal from only the currently loaded
  page — compute it via a SQL window function over the media's entire
  history, before pagination is applied.
- Editing a Diary event may only change `watchedAt`, never the
  underlying movie/show/season/episode identity.
- Deleting a Diary event always targets one exact viewing event (by id,
  ownership-scoped) — never every event for that media.
- Diary mutations (edit/delete) can change derived tracking state (watch
  count, Show progress, Home's Up Next/Continue Watching/Finish Soon
  membership) — never maintain a stale copy; let it recompute from the
  event rows.
- Diary's date grouping must respect the *browser's* local timezone, not
  the server's — group by UTC before the component has mounted (so
  server and client agree, no hydration mismatch) and switch to real
  local time after mount.
- Diary's provider metadata hydration must be deduplicated and bounded to
  the current page — one fetch per distinct movie/show, and one fetch per
  distinct show+season pair, reused across every visible episode in that
  season, never one request per event.
- Diary is private, per-request data — reads must derive the user from
  the session and must never enter a shared/public cache.
- Diary should read as a personal media diary — chronological, artwork-
  led, calm — never an audit log, a social activity feed, or a
  statistics dashboard.

## Stats

- Stats is derived from user-owned history/opinion + normalized provider
  metadata; do not persist favorite genres/people, viewing-time totals,
  or any other analytical output as source of truth — see docs/stats.md.
- Stats analytics must distinguish title-level preference (Genre/People)
  from viewing-event volume; Episode count must never inflate a Show's
  title-level genre/People weight — a Show counts once, like a Movie.
- Personal ratings count once per title regardless of rewatches.
  Rewatches are a separate behavioral signal.
- Do not declare favorite genres/actors/directors from tiny samples; use
  the explicit minimum-data thresholds in `server/stats/constants.ts`.
- Public provider popularity must never substitute for personal taste.
- Every visible personal insight must be directly supported by its
  calculation — no embellished interpretation, no AI-generated taste
  personality copy.
- Provider hydration for Stats stays bounded (recency + always-rated-
  titles selection, see docs/stats.md) regardless of total lifetime
  history size; never one provider request per historical title/episode.
- A viewing-time estimate may only render once measured runtime coverage
  clears its documented threshold — never shown as false precision.
- Prefer a small number of useful insights over dashboard-style metric
  overload; Stats UI stays editorial/media-first, never analytics-
  dashboard-like (no KPI cards, no rainbow chart palettes, no gamification).
- Stats (`/stats`) is a top-level primary destination, not part of
  Library — `LibrarySectionNav` covers Library/Diary only.
- Private Stats results must never enter shared/public caches.
- Analytics helpers should stay reusable for a future Year in Review
  where naturally appropriate (e.g. accepting a date range), without
  building that UI now.

## Calendar

- Calendar (`/calendar`) is Personal Release Intelligence, not a public
  release database — events are derived from the user's own Tracking/
  Planning relationships + current provider metadata; there is no
  `calendar_events` table and nothing here is ever persisted as source
  of truth. Never fill it with every trending/popular/provider release —
  see docs/calendar.md.
- Event dates are date-only (`YYYY-MM-DD`) and must never round-trip
  through `new Date(dateOnly)` + local getters (the classic UTC-shift
  bug) — parse the numeric parts directly. "Today"/"Tomorrow" labels may
  only appear once the real local timezone is known (post-mount, same
  SSR-safe pattern Diary's date grouping uses); before that, use a plain
  dated label. Never fabricate a time of day for a date-only value.
- Calendar, Home, Library, and Show Details must share one unified next-
  episode/eligibility domain (`getShowEpisodeProgress`/
  `hasKnownFutureEpisode`) — never a separate per-surface calculation
  that can silently disagree with the others.
- "New Episode Available" is derived at read time from the show's own
  next-unwatched-aired-episode, exactly like `caught_up`/`waiting` —
  never a new persisted status, never a manual state flip.
- Group same-date, same-title events into one row — never one row per
  raw event.
- "Recently released" is a short, explicitly bounded recovery window
  (not an unbounded "every unwatched episode ever," which stays Home's/
  Library's job) — see `CALENDAR_RECENT_WINDOW_DAYS`.
- Movie release events use TMDB's one generic release date only — never
  fabricate a theatrical/digital/physical breakdown, and never invent a
  region preference to personalize it (none currently exists).
- Respect existing preferences (Spoiler protection, Theme, Density,
  Motion) exactly as their centralized policies already define them —
  never a Calendar-specific reinterpretation, and never add a new
  Calendar-only setting (e.g. "Week starts on") without a real
  requirement.
- Show/season detail provider caching must stay freshness-aware
  (`SHOW_DETAILS_REVALIDATE_SECONDS`, a few hours — not the 24h "static"
  details window) so a newly-aired episode doesn't stay invisible for a
  day.
- Calendar's composed events are private, user-scoped data — never enter
  a shared/public cache, same rule as Tracking/Library/Diary/Stats.
- No push/email/browser notification infrastructure yet — the event
  model should stay clean enough to support that later, but do not build
  any notification UI or delivery mechanism in this phase.

## Home

- Home is primarily a decision surface: personal active viewing
  (`server/home/`) comes before public discovery when it exists, and
  renders nothing personal at all when it doesn't — see docs/home.md.
- Up Next is the single strongest currently-watchable next episode
  (`ShowProgress.nextUnwatchedEpisode`), never the provider's next
  episode to air, never a Watchlist/Backlog item, never taste-based.
- Continue Watching contains other active shows with a real unwatched
  aired episode available. Finish Soon is derived from a small, named
  remaining-episode threshold (`FINISH_SOON_MAX_REMAINING_EPISODES`).
- On Hold, Dropped, Caught Up, Waiting, and Completed shows must never be
  surfaced as active Home continuation — they have nothing currently
  available to continue, and remain reachable through Library.
- One show must never be duplicated across Up Next/Finish Soon/Continue
  Watching — `classifyActiveShows` is the one place that precedence is
  enforced.
- Up Next/Continue Watching/Finish Soon are derived projections, exactly
  like Tracking's `caught_up`/`waiting`/`completed` — never persisted as
  a source-of-truth status.
- Never imply video playback ("Play"/"Resume"/"Watch now", a playback
  progress bar) — this application tracks media, it doesn't stream it.
- Up Next shows the show's own poster/backdrop, never the next episode's
  still image or overview — an unwatched episode's plot is never
  revealed.

## Pick for Me

- Pick (`/pick`, `server/pick/`, `features/pick/`) is a decision engine,
  not a feed, carousel, dashboard, chatbot, filter page, or randomizer —
  see docs/recommendations.md. Its success metric is how fast a user can
  confidently choose something to watch.
- Default output stays small: exactly one Best Pick plus up to
  `PICK_ALTERNATIVE_COUNT` Alternatives, never a scrollable list
  underneath. Prefer fewer, better recommendations.
- Existing intent and progress are usually considered before offering new
  Discovery — an active show with a real next episode, or a good Backlog
  title, regularly and correctly beats a brand-new discovery pick.
  Backlog outranks Watchlist. Discovery must earn its place through real
  taste-affinity evidence, never default to "something new" just because
  it's available.
- Ranking stays deterministic, explainable, and testable — every weight
  lives as a named constant in `server/pick/constants.ts`, never a magic
  number inline, and the same inputs always produce the same output.
- Controlled session variety (rotating which near-tied candidate becomes
  primary across separate visits) is allowed only among genuinely
  close-scoring top candidates — a meaningfully weaker candidate must
  never win. Pure randomness is never acceptable here.
- Every reason shown to the user must be directly supported by known,
  real data (a structured `ReasonFact`, never a raw string built ad hoc)
  — no generic "we think you'll love this," no fabricated match
  percentage, ever.
- Private note text, streaming-provider/"My Services" availability, and
  collaborative filtering are never inputs to candidate generation or
  ranking. If a future Where-to-Watch feature exists elsewhere in the
  product, it must not leak into Pick without a deliberate, separately
  reviewed decision.
- "Not now" is a session-only hide — never a permanent dislike, never
  Dropped, never any persisted taste signal. Candidate generation stays
  bounded (see the caps in `server/pick/constants.ts`); the personalized
  result is always user-private and never shared-cached.
- On Hold, Dropped, Completed, and Waiting/Caught-Up-with-no-aired-next
  shows are never continuation candidates — reuse Home's own
  `getPersonalHome()`/eligibility, never a second derivation of the same
  fact.
- Time-fit claims require real runtime data — an unknown-runtime
  candidate never claims to fit the strictest ("Quick") time preset.
- If Pick ever starts to feel like another browsing experience instead of
  a fast decision, redesign it rather than patching around the symptom.

## UX & Interaction

- Common tracking actions should be available at the nearest useful
  context; avoid sending a user through Show Details → Season → find the
  episode for something they could do from where they already are.
- Home's Up Next and an active Library Show both support direct
  next-episode tracking — never require opening Show Details for it.
- Saving to Watchlist/Backlog is one interaction with two intents, not
  two competing buttons: an unsaved `PlanningControl` click saves
  straight to the default intent (Watchlist) in one click; clicking an
  already-saved control (its label/icon now reflecting that state) opens
  the secondary choice to switch intent or remove. Don't reintroduce a
  menu into the unsaved path.
- Media previews in personal/state-aware contexts should communicate the
  user's relationship with the media (Watchlist, Watching, Watched, next
  episode, ...) without badge overload — one or two pieces of
  information, in text and information hierarchy, never a pill collection.
- The primary contextual action for an item must stay visible; secondary/
  less-frequent actions belong in a contextual menu, not beside it with
  equal visual weight.
- Never hide essential functionality behind hover alone — keyboard focus
  and touch both need equivalent access.
- Avoid one private-state query per media card; batch personal-state
  lookups for a set of media identities into a bounded read.
- Public provider-metadata caching and private preview-state composition
  are separate concerns — never shared-cache a rendered row/list once it
  includes a user's personal state.
- Prefer an immediate UI state change over a toast for a successful quick
  action; reach for a toast only when the acting control won't still be
  on screen to show the new state itself (e.g. Up Next's "Watched · Undo"
  confirmation, held in place before the section moves on).
- Episode/tracking UI must never resemble a task-management checklist —
  one compact control per row.
- Reduce unnecessary interaction steps for common actions when doing so
  doesn't compromise clarity or the safety of a destructive action.
- Existing UI may be rebuilt when an evolving product interaction
  genuinely needs a stronger solution than what's there — don't preserve
  a weaker design just because it already shipped.
- Premium UX means clarity, predictability, speed, and excellent
  feedback — not decorative complexity, novelty, or heavy motion.
- Frequent, clearly-recognizable actions (Save, Watched, More, trailer
  play) should use icon-first interactions rather than repeated styled
  text buttons. Icon-first controls may still be real `<button>`
  elements — what shrinks is visual button chrome (fills, borders), not
  semantics.
- Don't call an icon-chrome swap done — mechanically wrapping an icon in
  a bordered/filled Button and stopping there isn't the goal; the
  surrounding layout/spacing should be recomposed for the lighter
  control, and any remaining visible Button needs a real reason to stay
  one (e.g. it's the page's one primary action).
- Icon-only controls require a precise, contextual accessible name (e.g.
  "Save Inception to Watchlist", not "Save") — critical once the same
  icon repeats across a list — plus visible focus and a comfortable hit
  area even when the visible icon stays small.
- Don't create icon clusters. Most media contexts should expose at most
  one primary action plus a small number of restrained secondary icons;
  domain-specific concepts without an obvious icon (Backlog, On hold,
  Resume, Caught up) keep text.

## Settings

- Settings is a secondary utility destination at `/settings`, reachable
  from the account control (desktop: bottom of the side rail; mobile: the
  header strip) — never one of the primary nav destinations, and never a
  fifth/sixth mobile bottom-nav item.
- Every visible setting must be real, implemented, and durable — never a
  placeholder, a disabled "coming soon," or a control that updates local
  UI with no product effect. If a setting can't be given a genuine,
  unambiguous effect, omit it rather than fake one — see docs/settings.md,
  "Settings considered and cut."
- Every setting needs a permanently visible, plain-language explanatory
  comment beneath it — never hidden behind a tooltip/accordion/info icon.
- `user_preferences` (one row per user, `ON DELETE CASCADE`) is the one
  durable preference store; "no row" and "every column at its default"
  are the same state — see docs/settings.md. Never a second, competing
  preference source: browser storage (next-themes' localStorage) may
  bootstrap fast, flash-free rendering for one browser, but the database
  row is always the durable, cross-device record Settings itself reads
  and writes.
- Settings save immediately on change — no "Save Settings" button.
  Optimistic controls roll back only on a real write failure.
- Visual choice settings (Theme, Density, Motion, Spoiler protection,
  Home focus) use the shared `VisualChoice` primitive with a genuinely
  explanatory miniature preview; settings that change interaction
  behavior rather than layout (Default Save destination, Default
  Discover view) use the plain `TextChoice` primitive instead — never a
  forced, meaningless preview.
- Spoiler protection is one centralized, deterministic, pure policy
  (`resolveEpisodeSpoilerDecision`) — never reimplemented per surface.
  Movies are out of scope; spoiler risk is a TV-episode-progression
  concept only.
- Settings UI stays open/editorial (title + comment + control) — never a
  card-per-setting SaaS/admin pattern.
- Do not add cosmetic theme-builder preferences (border radius, fonts,
  arbitrary accent colors, shadow strength) — Settings personalizes
  behavior and appearance modes the product already designed, it is not
  a theme editor.
- Settings' "Developer" category (mock data seeding, full account data
  reset) is local testing tooling only — gated in two independent
  places (route/nav visibility and the domain-layer mutations
  themselves) so it can never run in a production build. Mock data
  always goes through the same real domain functions a genuine user
  action would call — never a raw-SQL shortcut. A full data reset is
  categorically more destructive than "Reset preferences" and requires
  a typed confirmation, not just a confirm dialog.

## Data Portability

- User viewing history and personal media state are portable user-owned
  data. Settings → Data (`/settings/data`) is a trust and onboarding
  feature, not a generic backup dashboard — see docs/data-portability.md.
- Imports must preview mutations before write; file upload alone must
  never mutate user state. The preview is a real dry run (a computed
  `ImportPlan`), not an approximation of what confirming will do.
- Imported and native watch events share the same core semantics after
  validation — no downstream feature branches on import source, and
  `import_batch_id` is never exposed on a domain type Library/Diary/
  Stats/Calendar/Pick actually consume.
- Never fabricate EpisodeWatchEvents from vague show-level completion
  data. Exact episode history is imported only when the source actually
  supplies season + episode + a watch date.
- Never silently overwrite existing ratings or private notes. Existing
  MEDIO state always wins over an imported value across every domain
  (Planning/Ratings/Notes/Show tracking state) — import only ever fills
  in what didn't already exist.
- Preserve real rewatches; duplicate detection must not collapse
  distinct viewing events. Compare at the precision the source actually
  gave (exact instant vs. date-only), never invent finer precision than
  that.
- Source-specific parsers must normalize into MEDIO-owned import models
  (`ParsedImportRecord`) before persistence — parser code never touches
  the database, and persistence code never branches on source.
- Ambiguous media identity requires explicit review; do not silently
  fuzzy-match. Match confidence is always a human state (Matched/Needs
  review/Not found), never a fake percentage.
- Importing the same source repeatedly must be idempotent where records
  are identical — duplicate detection runs both against existing DB
  state and within the same import pass.
- Import provenance (`import_batch_id`) is audit metadata and must not
  leak into normal Library/Diary product semantics — no permanent
  "Imported" badge in regular product UI.
- Rollback may only remove exact safe mutations attributable to the
  import batch — never every record that happens to match imported
  media. A later real user edit/mutation always detaches a row from its
  batch first (ownership transfer), so rollback can never remove an
  independent later choice.
- Native exports must be versioned (`NATIVE_EXPORT_SCHEMA_VERSION`) and
  must not include credentials, secrets, sessions, or provider caches.
- Export CSV must be protected against spreadsheet-formula injection
  (`sanitizeCsvCell` — a leading `=`/`+`/`-`/`@` gets neutralized).
- Raw uploaded viewing-history files are private and must not be sent to
  analytics/logging — parsed then discarded, never persisted raw.
- Imported history must naturally feed existing Stats, Taste, Library,
  Diary, Calendar, and recommendation derivations without source-specific
  branches — this is a deliberate architectural test, not just a UX
  nicety.

## Product principles

These hold regardless of what phase is currently in progress:

1. Content brings the color. The UI stays restrained; posters, artwork, and
   media data are what make it feel alive.
2. One obvious next action. Every screen should make it clear what the user
   does next, not present them with an open-ended list of options.
3. Optimize for helping the user decide what to watch, not for accumulating
   lists. A watchlist that never gets acted on is a failure.
4. Watch history is critical, user-owned data. Treat it with the durability
   and care of data the user would be upset to lose.
5. External media providers (metadata, images, availability, etc.) must not
   leak directly into the core product domain — integrate them behind a
   server-side boundary and model the domain in our own terms.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
