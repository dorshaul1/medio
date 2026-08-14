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
- Mobile is a first-class, independently designed MEDIO experience —
  never treat it as compressed desktop. Secondary information may be
  hidden, deferred, or reorganized on mobile when that improves clarity,
  as long as core functionality isn't lost.
- Essential actions must never depend on hover alone — anything
  necessary to use the product must also work by tap/keyboard focus.
  Desktop-only pointer affordances (e.g. `MediaRowScroller`'s scroll
  arrows) are fine specifically because native scroll already covers
  touch/trackpad without them.
- Give compact icon-only/toggle controls (`IconButton`'s `sm` size,
  `Switch`, `Checkbox`) an invisible expanded hit area (a `relative` +
  `before:absolute before:-inset-*` pseudo-element) when their visible
  box is smaller than a comfortable touch target — the visible control
  stays small; the tappable area doesn't. Verify there's no dense
  adjacent-control context where the expanded area would overlap a
  neighboring control.
- Interactive product chrome (nav labels, tabs/segmented controls, toggle
  buttons, day-grid cells) should carry `select-none` so normal taps
  don't trigger accidental text selection — never applied globally, and
  never on genuinely readable content (descriptions, notes, overviews),
  which must stay selectable.
- Prefer `dvh` over `vh` for full-viewport-height containers (`min-h-dvh`,
  not `min-h-screen`) — `vh` is fixed at load and reads wrong as mobile
  browser chrome shows/hides; `dvh` stays correct.
- A `Dialog`'s content may be taller than the viewport — it scrolls
  inside itself (`max-h-[calc(100dvh-4rem)] overflow-y-auto` on
  `DialogContent`) rather than silently overflowing past the screen.

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
- The mobile header strip (wordmark + `AccountControl`, in `AppShell`) is
  `sticky`, not merely fixed at the top of the page — it stays reachable
  on long scrolling routes (Library, Diary, Stats) without permanently
  occupying more vertical space than its own height. Solid background,
  not translucent/blurred — content must be fully hidden behind it, never
  showing through.

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
- `/` is MEDIO's public Landing page for logged-out users; a logged-in
  user navigating to `/` enters the authenticated Home experience without
  visible flicker. Neither case is ever a redirect — both are decided
  server-side in `src/app/page.tsx` before anything renders — see
  docs/authentication.md, "`/` behavior by auth state".
- Logged-out users may browse only explicit public/auth routes; every
  other protected route redirects to Sign In (`src/proxy.ts`, plus
  `requireSession()` as defense-in-depth for anything the proxy matcher
  doesn't cover). This is a UX convenience, not authorization — any
  server code that reads/writes user-owned data must still validate the
  session itself at that point — see docs/authentication.md.
- Logout always returns to `/` (the public Landing page), never to
  `/sign-in`.
- A safe internal return destination (`?next=`) may be preserved through
  Sign In/Sign Up; external or protocol-relative "return" URLs are always
  rejected (`src/lib/safe-redirect.ts`) — never trust `next` blindly.
- Keep auth/database code server-only; never expose `BETTER_AUTH_SECRET` or
  a session token (no logging either).
- Use Better Auth's inferred types (session, user) — don't hand-duplicate them.
- Don't add auth plugins/providers (social login, MFA, etc.) without a real
  requirement — see `docs/authentication.md` for what's deliberately deferred.
- Don't add dead auth UI (a link/button for a feature that doesn't exist) —
  e.g. no "Forgot password?" link until real password-reset infrastructure
  exists.
- Landing/auth visuals follow MEDIO's premium consumer-entertainment
  identity and the same bespoke anti-template standard as the rest of the
  product — no centered card, no generic SaaS auth/landing look.
- Sign In/Sign Up use accessible native form semantics, correct
  autofill/password-manager attributes, and polished error/pending
  states; raw Better Auth error codes are never shown to a user (see
  `src/lib/auth-errors.ts`).
- Public Landing output must never contain user-private data, and must
  never share-cache anything session-dependent.
- Reuse `src/components/ui/` primitives before creating auth-specific ones;
  if a primitive is missing something auth needs, fix the primitive.

## Landing

- MEDIO's Landing page (`src/features/landing/`) explains the product
  through bespoke product illustrations, not generic feature cards —
  each major section shows a real MEDIO concept (exact episode tracking,
  Watchlist/Backlog meaning, Up Next, Pick for Me, release awareness,
  personal taste) via a purpose-built illustration component
  (`src/features/landing/illustrations/`), never a
  heading+paragraph+icon block.
- Public illustrations are simplified representations of real MEDIO
  concepts, built from plain HTML/CSS/SVG and a small centralized demo
  dataset (`src/features/landing/demo-content.ts`) — never real user
  data, never a live provider fetch, never a literal screenshot of the
  authenticated app.
- Landing copy describes concrete consumer outcomes ("MEDIO remembers
  exactly which episode comes next") and avoids generic SaaS language
  ("seamless," "elevate," "unlock," "revolutionize," "ultimate," "smarter
  entertainment"). Pick for Me is never described as "AI-powered."
- Pick for Me, exact episode tracking, meaningful Library state (Watchlist
  vs. Backlog vs. Watching), and personal viewing history are core public
  product stories. Related ideas (Up Next + release awareness; Diary +
  Stats + Taste) are told as one combined section, not one section per
  route/feature — group by outcome, not by internal domain boundary.
  Pick for Me is the flagship and gets the page's largest, most visually
  distinct moment, never an equal-sized feature card.
- Section visual weight is deliberately unequal (Tracking and Pick for Me
  largest; supporting ideas smaller/quieter) and layout varies
  intentionally per section (asymmetric splits, at least one full-width
  breakout moment) — never one repeated template
  (eyebrow+heading+paragraph+bordered-illustration-card) applied
  mechanically to every section.
- Landing may be more expressive than the authenticated product (richer
  illustrations, larger type, more motion) but keeps MEDIO's neutral
  chrome and content-led color — Clay stays the one accent (CTA,
  progress, small highlights, the wordmark), never a background color or
  every heading.
- A small illustration may be genuinely interactive (real local demo
  state — e.g. marking a demo episode watched, switching a demo title's
  saved state, changing Pick for Me's time context) when it demonstrates
  the product better than a static illustration would — never real data,
  never a network request, and the page must remain fully understandable
  without touching anything.
- Never add fabricated testimonials, user counts, ratings, press logos,
  or any other social proof.
- Keep Landing predominantly server-rendered with narrow client
  boundaries — only genuinely interactive pieces (the theme toggle, the
  small interactive demo illustrations) are Client Components.
- Mobile Landing illustrations are independently composed, never a scaled-
  down desktop layout — see `docs/architecture.md` if a mobile-specific
  illustration variant is ever needed.
- Richer Landing content must not come at the cost of performance — no
  heavy animation/chart dependency, no unnecessary client JS, prefer
  CSS/SVG.
- Every major public section must earn its place and communicate a
  distinct product benefit — if two sections say the same thing, combine
  them rather than keeping both.

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
  content. Discover owns unified Search (Movies/Shows/People) and
  intentional Movies/Shows genre exploration. Don't duplicate Home's
  sections inside Discover without a real product reason — see
  `docs/architecture.md`, "Home vs Discover". See "Search & Discover"
  below for the deeper rules.
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

## Search & Discover

- MEDIO Search is unified across Movies, Shows, and People in one
  cross-type relevance ranking — never grouped into separate Movie/Show/
  People sections or fixed per-type quotas, and result type never
  determines default priority (Show > Movie > Person, or any other fixed
  ordering, is not allowed). Users never choose a media type before
  searching. See `docs/search.md`.
- Search, Discover, and Pick for Me are three distinct product roles and
  must stay that way: Search is known-intent lookup ("I roughly know what
  I'm looking for"), Discover is exploration ("show me something worth
  exploring"), Pick for Me is decision-making ("decide for me now").
- Search ranking uses textual match quality (exact/prefix/word-boundary/
  substring) as the dominant signal; provider popularity/relevance and
  recency are ambiguity resolvers only, weighted so they can never lift a
  weaker text match above a stronger one. Personal media state gives only
  a small, bounded relevance boost — never enough to beat a clearly
  better textual match. Search ranking and Pick for Me ranking are
  separate domains — provider popularity is a much stronger, legitimate
  signal for Search intent resolution than it is for personal
  recommendations; never reuse Pick's weights for Search or vice versa.
- Media type in a unified result is communicated through subtle
  icon+word metadata (`ResultTypeTag`), never a colored badge, and may be
  offered as an optional user filter (default "All") — never the
  starting architecture.
- People are first-class Search results (same row scale as a Movie/Show
  result, not a smaller secondary treatment) and route to `/people/[id]`.
- Search/Discover results display user-private media state (Watchlist/
  Backlog/Watched/Watching/...) quietly, and support quick Save reusing
  the exact same planning Server Actions and Default Save Destination
  Movie/Show Details use — never a parallel mutation path. Personal state
  for a visible result set is always one batched lookup
  (`getPersonalStates`), never a query per result.
- Discover is editorial and varied — a small number of real, honestly-
  labeled collections (never an invented judgment like "Hidden gems," and
  never a duplicate of Home's own Trending/Popular/In-theaters rows) —
  not an endless stack of near-identical rows.
- Avoid advanced database-style filtering; MEDIO is not IMDb Advanced
  Search. Genre browsing stays genre rows + a genre page + a plain
  "More genres" list — never a filter sidebar.
- Mobile Search and Discover are independently composed and must not
  rely on hover for anything essential.
- TMDB search/discover responses may use normal public provider caching;
  the personalized compositions built on top of them (ranked results with
  personal state attached) remain private, request-scoped, never shared-
  cached.
- Don't create a universal media-card mega-component to force Home,
  Discover, Search, and Library into identical layouts — a search result
  row, a genre grid tile, and a Library row are deliberately different
  compositions for different contexts.

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
  table" — see `docs/library.md`. It is MEDIO's complete organized
  personal media space; Home remains the prioritized current-view
  surface, and Library never duplicates Home's sections.
- Watchlist and Backlog are planning intents (`server/planning/`), never
  tracking statuses. Watchlist means lightweight saved interest; Backlog
  means stronger intent to watch. The two must stay directly
  interchangeable (`changePlanningIntent`) — never a remove-then-re-add
  workflow.
- Starting/watching planned media clears its planning state (in the same
  transaction as the tracking write) without deleting any history.
- Derived Show states — Caught up/Waiting/Completed — must never be
  copied into Library (or any) persistence, same rule as Tracking above.
- Library UI must expose personal context (state, progress, planning
  intent, personal rating) and must not simply reuse Discover's poster-
  grid cards unchanged — personal context always takes priority over
  generic provider metadata (popularity, genre lists, provider rating).
- Active Show items expose the exact next aired unwatched Episode
  (`LibraryNextEpisode`) and support the same quick-tracking actions as
  Show Details/Home — never require opening Show Details just to mark it
  watched.
- Avoid a giant all-state filter toolbar or a permanent wall of state
  tabs/chips; expose only the raw, genuinely stored states relevant to
  the current media type filter. Derived states are never a pre-filter
  (see docs/library.md). The default ("All states") view instead clusters
  already-fetched items into a small, fixed In progress → Planned →
  Paused → Finished hierarchy (`groupLibraryItems`) — inactive states
  (Dropped/On hold) and finished history stay reachable without
  dominating what's active.
- Library search (`server/library/search.ts`) searches only this user's
  own Library state — never the global TMDB catalog, and never a live
  provider request per keystroke (bounded/capped candidate scan, debounced
  client-side commit).
- Library metadata hydration fetches one `ShowDetails`/`MovieDetails` per
  visible title, never every season/episode of every visible show, and
  never a per-item query for personal state (planning/tracking/rating are
  always batched) — this must hold at large collection sizes, not just
  small ones.
- Mobile Library is independently composed (a compact row, not a poster
  grid) and may omit secondary metadata while preserving core actions —
  never a shrunk desktop layout.
- Private Library data must never enter a shared/public cache — it's
  always request/user scoped, same as Tracking.
- Library and Diary have distinct roles — collection/state vs.
  chronological viewing history — see "Diary" below.
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

- Diary (`/library/diary`) is a chronological view of canonical
  `MovieWatchEvent`/`EpisodeWatchEvent`s (`server/diary/`) — never a
  separate source of truth, never a Diary persistence table. Library =
  what belongs to my personal media world (planning + state); Diary =
  what did I actually watch, and when; Stats = analysis of the same
  events — dependency direction is always Watch Events → Diary and Watch
  Events → Stats, never Diary → Stats.
- Imported and native watch events render identically, by their real
  original `watchedAt` — no permanent "Imported" badge in the timeline.
- Rewatches remain separate, independent events — never collapsed into a
  "watched N times" summary row (that belongs on Movie/Show Details).
  Same-day same-show Episode session grouping is presentation-only: it
  must never collapse rewatches into each other, hide an ordinal, or
  lose access to any individual event's own Edit/Delete once expanded.
- Current title-level ratings/reactions are never presented as
  historical per-event data (no fabricated "you rated this 5/5 on
  {date}") — this app has no historical rating-event data. Notes are not
  Diary entries and never render in the timeline.
- Cross-type Diary pagination (Movie + Episode events) must be globally
  stable — one keyset/cursor query (`(watched_at, event_type, id)`),
  never fetch-N-of-each-then-concatenate.
- A rewatch's ordinal is always a SQL window function over the media's
  *entire* history — never recomputed from just the loaded page or a
  month-range filter applied to the same query.
- Editing a Diary event may only change `watchedAt`, never the
  underlying movie/show/season/episode identity. Deleting always targets
  one exact event (id, ownership-scoped) — never every event for that
  media.
- Diary mutations (edit/delete) recompute all dependent state (watch
  count, Show progress, Home's Up Next/Continue Watching/Finish Soon)
  naturally from the event rows — no Diary-specific manual sync.
- A large history requires bounded date-range querying — Diary defaults
  to one real month at a time, never paging through everything before
  the requested period — and batched, deduplicated provider hydration
  (one fetch per distinct movie/show, one per show+season pair), never
  one request per event.
- Date navigation uses two intentionally different, established
  timezone bases: a month *query* boundary is UTC (same documented
  simplification as Stats' own monthly bucketing); per-entry "Today"/
  "Yesterday" *grouping* switches to the browser's real local timezone
  once mounted (UTC before mount, so server/client agree). Don't unify
  them into one basis.
- Diary is private, per-request data — reads must derive the user from
  the session and must never enter a shared/public cache.
- Diary should read as a personal media diary — chronological, artwork-
  led, calm — never an audit log, a social activity feed, or a
  statistics dashboard.

## Stats

- Stats is MEDIO's personal analytics/insight surface and must remain
  editorial rather than a BI dashboard — see docs/stats.md. It is
  derived from user-owned history/opinion + normalized provider
  metadata; do not persist favorite genres/people, viewing-time totals,
  computed ranges/comparisons, or any other analytical output as source
  of truth.
- Unique-title counts and viewing-event counts are distinct and must
  never be conflated — a Movie watched four times is one unique Movie
  and four viewing events, three of them rewatches. Episode count must
  never inflate a Show's title-level genre/People weight (a Show counts
  once, like a Movie), and Movie-vs-TV comparisons must use comparable
  units — never compare a unique Movie count directly against a raw
  Episode count as if they were equivalent shares.
- Genre/People "most watched" (exposure) and "highest rated"
  (preference) are different questions — never collapse them into one
  list, and prefer surfacing a real contrast between the two when one
  exists over showing either alone.
- Personal ratings count once per title regardless of rewatches.
  Rewatches are a separate behavioral signal. Current title-level
  ratings must never be presented as historical rating events — a
  date-range insight includes a title because it was *watched* in that
  range, but its rating is always the title's current one.
- Do not declare favorite genres/actors/directors from tiny samples; use
  the explicit minimum-data thresholds in `server/stats/constants.ts`.
  A watch-time estimate may only render once measured runtime coverage
  clears its documented threshold — never invent a default runtime, and
  never show false precision.
- Public provider popularity must never substitute for personal taste.
- Every visible personal insight must be directly supported by its
  calculation — no embellished interpretation, no AI-generated taste
  personality copy, no note-text analysis (private notes are never
  Stats input).
- Provider hydration for Stats stays bounded (recency + always-rated-
  titles selection, see docs/stats.md) regardless of total lifetime
  history size; never one provider request per historical title/episode.
- Date ranges reuse Diary 2.0's own half-open `[start, end)` UTC
  boundary semantics (`server/stats/range.ts`) — never a second,
  independent timezone interpretation. Range-scoped queries stay bounded
  SQL aggregation, never an unbounded raw-event pull for "All time."
- Show completion/TV Journey needs a defensible denominator (exclude
  Caught Up/Waiting/On Hold/never-started shows from a naive ratio) —
  omit the metric entirely rather than show a misleading percentage.
- Comparison is opt-in and single-period by default; only show a
  comparison fact where the two periods are genuinely, meaningfully
  different, phrased in plain language — never a red/green up/down
  judgment (watching more or less isn't inherently good or bad).
- Sparse users see fewer, real insights, never filler placeholders — a
  section omits itself entirely rather than rendering with too little
  evidence to be meaningful.
- Prefer a small number of useful insights over dashboard-style metric
  overload; every visualization must answer a real question a screen
  reader can also get as text — remove a chart that exists only for
  decoration. Stats UI stays editorial/media-first, never analytics-
  dashboard-like (no KPI cards, no rainbow chart palettes, no gamification).
- Mobile Stats may simplify or replace a visualization entirely when
  that improves comprehension — never just a shrunk desktop chart.
- Stats (`/stats`) is a top-level primary destination, not part of
  Library — `LibrarySectionNav` covers Library/Diary only.
- Private Stats results (including any computed comparison) must never
  enter shared/public caches.
- Pick for Me may share Stats' pure ranking helpers, but must never
  depend on a live Stats UI projection or its selected date range —
  Pick always reasons over the user's entire history.

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
- Up Next and Home layout are two independent preferences —
  `showUpNext` (default on) and `homeLayout` (`resolveHomeLayout`,
  `server/home/layout.ts`). Up Next is never encoded into a layout
  variant (no `calendarWithUpNext`); when on, it renders above whichever
  layout is selected, in every layout, composed at render time
  (`PersonalizedHomeSections`) — see docs/home.md, "Up Next is a separate
  preference". If no valid Up Next exists, it hides gracefully even when
  the preference is on.
- Home layout options are Balanced, Personal, and Calendar
  (`resolveHomeLayout`, `server/home/layout.ts`) — see docs/home.md,
  "Home layout and composition". Finish Soon/Continue Watching
  (`showContinuationRows`) render for Balanced/Personal only — Calendar's
  body is calendar content alone.
- Discovery is a dedicated product destination (`/discover`) and must
  never be duplicated as a Home-layout option — Home never grows a
  layout whose entire point is "more Trending/Popular."
- Calendar layout uses the canonical Calendar/Release Intelligence domain
  (`getCalendarEvents`/`buildReleaseTimeline`) and prioritizes personally
  relevant new/upcoming releases — never a separate Home release
  calculation, never general entertainment news, never all upcoming TMDB
  releases, never Trending. Its body never mixes in Continue Watching,
  discovery rows, or a Backlog row.
- Home layout changes composition and hierarchy meaningfully (what
  renders — a calendar agenda, a Backlog row, how much public discovery
  shows), not merely cosmetic row ordering.
- When Home layout is Calendar, a third independent preference,
  `homeCalendarView` (default the full grid), decides whether that body
  is the Today/This week/Later agenda or the full calendar month grid
  (`HomeCalendarMonth`, reusing `CalendarMonthView` unchanged) — the same
  "upcoming"/"calendar" choice `calendarDefaultView` offers for
  `/calendar` itself, but a genuinely separate preference for a different
  destination; never conflated with it.

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
  Home layout) use the shared `VisualChoice` primitive with a genuinely
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

## PWA

- MEDIO is technically a cross-platform, standards-based PWA — never
  degrade the manifest/Service Worker or block browser/OS-native
  desktop installation — but its **custom install promotion** is
  intentionally mobile-focused; nothing in the product may require
  installation or Service Worker support to work. See docs/pwa.md.
- Installability (can the platform install MEDIO) and install
  promotion (should MEDIO show its own installation UI right now) are
  separate concepts and must stay separate in code — see
  `InstallPromotionState`/`deriveInstallPromotionState`
  (`src/features/install/install-policy.ts`).
- Mobile Landing and mobile Settings are the canonical MEDIO install-
  promotion surfaces. Desktop Landing may communicate MEDIO's mobile
  Home Screen/app experience but must never show a MEDIO-owned desktop
  Install CTA, and desktop Settings must never render an install row —
  unless a future explicit product decision changes this.
- Installed MEDIO uses standalone behavior through the centralized
  install domain (`src/features/install/`) — never a forked/duplicated
  product UI for standalone vs. browser mode, and never a second,
  independent `beforeinstallprompt` listener per page.
- Installation must always be initiated by explicit user action — never
  automatically on page load, after Sign Up, or after Login. Already-
  installed users must never see a redundant installation control.
- Platform-specific manual-install instructions (iOS Safari's "Add to
  Home Screen") must reflect current real platform behavior, shared by
  every surface that shows them — never duplicated/redefined per page.
- Account creation remains more important than installation in
  Landing's hierarchy — "Get started" is the one primary CTA; an
  install action never competes with it in the Hero.
- Never use PWA implementation terminology (PWA, Service Worker,
  manifest, standalone mode) in normal consumer-facing UI copy.
- Service Worker caching must never expose or persist private,
  per-user responses across accounts. Personalized surfaces (Home,
  Library, Diary, Stats, Settings, Pick for Me, any API/RSC/auth
  response) are never cached — only two narrow, genuinely public/
  immutable categories are (hashed static build assets, this app's own
  static icon/manifest routes), plus one static offline fallback page.
  Navigations are always network-first, never served stale.
- Full offline mutations/background sync are out of scope unless a
  dedicated sync architecture is explicitly introduced later. Offline
  UI must never claim a private mutation succeeded when it wasn't
  actually persisted.
- Mobile safe areas use `env(safe-area-inset-*)`, never hardcoded
  device-specific pixel values.
- The sticky mobile header and bottom navigation are first-class
  application chrome — changes to either must be verified in both
  normal browser and standalone/installed contexts.
- Essential mobile interactions must never depend on hover or a hidden
  gesture (see "UX & Interaction" above — this applies with equal force
  to the installed experience).
- Mobile keyboard behavior, `dvh`-based viewport units, comfortable
  touch targets, and scroll restoration are product-quality
  requirements, not PWA extras.
- A Service Worker update must never force an unexpected reload while
  the user is mid-edit — a new version only activates when the user
  explicitly clicks the update prompt's own action.
- Logout/account switching must never let another account's cached
  content flash or reappear — this holds by construction here (nothing
  private is ever cached), not through extra invalidation logic; keep
  it that way rather than introducing caching that would need one.
- PWA/mobile polish must never add meaningful client weight or hurt
  performance, and the installed app icon/identity must stay aligned
  with canonical MEDIO branding.

## Production

- MEDIO's production application is hosted on Vercel; production
  PostgreSQL is hosted on Neon (`aws-eu-central-1`/Frankfurt) — see
  docs/production.md.
- PostgreSQL major version is 18, matching local development exactly.
- Production secrets live only in Vercel's environment configuration —
  never in git, never in documentation, never echoed in a terminal/log
  beyond the one-time value a provisioning CLI necessarily prints.
- Local development keeps its existing local Postgres workflow
  (`docker compose`, `.env.local`) — the production `DATABASE_URL` must
  never be written to `.env.local` or any tracked file.
- Never point development reset/seed/test commands at production.
  `assertSafeDatabaseUrlForE2e` (`src/config/env/schema.ts`) hard-crashes
  E2E's own server boot if `DATABASE_URL` isn't local — there is no
  bypass flag.
- Production DB destructive operations (Developer settings' mock-data
  seed/full reset) require explicit safeguards and are already
  unreachable in any deployed build (`NODE_ENV === "production"`,
  double-gated at both the route and the mutation itself).
- TMDB credentials are server-only, in every environment.
- User-private data must never be shared-cached, in every environment.
- `/design-system` and other development/debug utilities must not be
  exposed in production (already gated by `NODE_ENV`).
- Production deployment must pass the same quality gates as any other
  change — `pnpm check`, `pnpm build`, at minimum.
- Prefer managed infrastructure (Vercel + Neon); do not introduce a
  self-hosted production server (VPS, Docker host, reverse proxy,
  self-managed Postgres, ...) without an explicit, separate architecture
  decision.
- Vercel Hobby and Neon Free are intentional initial cost choices — see
  docs/production.md, "Free tier". Do not upgrade either without explicit
  approval.
- Never add artificial keep-alive traffic (cron pings, scheduled health
  checks, ...) to defeat Neon Free's scale-to-zero behavior — the
  occasional cold-start latency is an accepted, deliberate tradeoff for
  $0 managed infrastructure.
- Future paid infrastructure changes (a Vercel/Neon plan upgrade, a
  custom domain, ...) require explicit user approval before spending
  money.

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
