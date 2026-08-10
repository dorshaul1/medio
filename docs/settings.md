# Settings

`/settings` is a secondary utility destination — reachable from the account
control (desktop: bottom of the side rail; mobile: the header strip), never
one of the four primary nav destinations and never a fifth mobile
bottom-nav item. It exists to make a handful of genuinely useful,
already-implemented behaviors configurable — never to turn the product into
a configuration panel. See CLAUDE.md, "Settings" for the durable rules.

## Every setting here is real

No placeholder controls, no "coming soon," no toggle that only updates
local UI. Every setting listed below has a traceable effect on a real
product surface — see "What each setting actually does."

## Persistence model — one row per user

`user_preferences` (`src/server/db/schema/preferences.ts`) is the one
durable preference table, keyed by `userId` (primary key, `ON DELETE
CASCADE`). A row is created only on the first preference change ever made
— "no row" and "every column at its default" are the same observable
state (see `DEFAULT_PREFERENCES`, `src/server/preferences/queries.ts`),
the same convention `media_notes` already uses for "only exists when it
holds real content."

`getCurrentUserPreferences()` (memoized per request via `React.cache`) is
the one read every server surface uses — safe to call from a public page
(returns defaults for a signed-out visitor) and cheap to call from many
places in the same request tree, since `React.cache` deduplicates
identical calls within one render. `updatePreferences`/`resetPreferences`
(`src/server/preferences/mutations.ts`) are the only writes; every
Settings control calls a thin Server Action wrapper
(`src/features/settings/settings-actions.ts`) that also
`revalidatePath("/", "layout")`, since a preference can affect rendering
anywhere in the authenticated app.

**"Reset preferences"** deletes the row entirely — the simplest correct
implementation of "restore every default," and it never touches watch
history, ratings, notes, or planning (none of which live in this table).

## No competing preference sources

Every preference has exactly one authoritative record: the database row.
The one nuance is Theme (see "Theme architecture" below) — next-themes'
own browser localStorage remains what actually paints a given browser
instantly, but it is never treated as a second source of truth for
*what the user's preference is*; Settings and the database always agree
on that.

## Theme architecture

Precedence, stated plainly:

1. The database `theme` column is the durable, cross-device record —
   what Settings displays and edits.
2. The root layout (`src/app/layout.tsx`) reads it via
   `getCurrentUserPreferences()` and passes it as next-themes'
   `defaultTheme` — which next-themes only ever uses as the *fallback*
   for a browser that has never recorded its own local choice yet. This
   is what seeds a brand-new device with the user's real setting instead
   of always starting from "system."
3. Once a browser has a local choice (from any earlier visit or from
   changing Theme in Settings), that choice is what next-themes' own
   localStorage renders instantly on every later visit, with zero flash
   — changing Theme in Settings calls `setTheme()` for this immediate,
   reload-free effect on top of the Server Action write.

This is a real, honest precedence — not a magic instant cross-tab/
cross-device sync. A change made in Settings on device A will not
retroactively repaint an already-visited device B; it seeds *future*
first visits and always updates the durable record Settings itself
reads. Root layout calling `getCurrentUserPreferences()` on every
request (including `/sign-in`/`/sign-up`) is a deliberate, accepted cost:
it removes `/design-system` from Next's static optimization, but that
route already `notFound()`s in production regardless (see
docs/architecture.md), so the real-world cost is effectively zero.

## Appearance architecture — density and motion

`data-density`/`data-motion` are set once, as attributes on `AppShell`'s
own root element (`src/components/shell/app-shell.tsx`) — populated by
the `(app)` layout's own `getCurrentUserPreferences()` call (deduplicated
against the root layout's call via `React.cache`, so this costs one DB
round trip per request, not two). Product code reads these via CSS
descendant-attribute selectors (`[[data-density=compact]_&]:...`) at the
handful of real surfaces that meaningfully benefit — never a per-component
prop or a JS branch on the preference value.

- **Density** — applied to `LibraryItemRow`, Diary's three row shapes
  (movie/episode/unavailable), and `EpisodeRow`: Compact tightens row
  padding and shrinks the poster/still slightly. Search results and genre
  grids are intentionally out of scope for this phase — a real, but
  bounded, first application rather than a half-applied global padding
  change everywhere.
- **Motion** — `[data-motion="reduced"]` applies the exact same
  animation/transition override `globals.css`'s `prefers-reduced-motion`
  media query already applies, scoped to the attribute instead of the OS
  signal. The OS-level media query is never suppressed by this — there is
  deliberately no "Full" override rule, since an explicit in-app
  preference should never re-enable motion the OS asked to remove.

## Spoiler protection

One deterministic, pure policy (`src/server/spoilers/policy.ts`) — every
surface that needs to know what to hide calls
`resolveEpisodeSpoilerDecision({ protection, watched })` rather than
re-implementing slightly different hiding rules. A watched episode is
never spoiler-protected, regardless of level.

| Level | Overview | Still / Title |
| --- | --- | --- |
| Off | shown | shown |
| Standard | hidden | shown |
| Strict | hidden | replaced with a neutral fill / "Episode N" |

Applied at Season's `EpisodeRow`, via `EpisodeSpoilerContent`
(`src/features/shows/episode-spoiler-content.tsx`) — the one place an
episode's still/title/overview actually render. This is not a security
boundary: the real content is always part of the initial payload (never
worth a server round trip to "reveal"), just conditionally rendered.
Clicking "Show details" reveals hidden content for that one row only, in
that one render — it never writes back to the global preference. Movies
are explicitly out of scope this phase (see CLAUDE.md) — spoiler risk is
concentrated in TV episode progression, not movie identity/overview.

## What each setting actually does

| Category | Setting | Real effect |
| --- | --- | --- |
| Appearance | Theme | next-themes `setTheme()` + durable record (see above) |
| Appearance | Content density | `data-density` on AppShell → Library/Diary/Episode row padding |
| Appearance | Interface motion | `data-motion` on AppShell → `globals.css` transition override |
| Tracking & Library | Default Save destination | `PlanningControl`'s one-click Save target (Movie/Show Details) |
| Spoilers | Spoiler protection | `resolveEpisodeSpoilerDecision` → `EpisodeRow` rendering |
| Home & Discovery | Home focus | `resolveHomeLayout` → Home's section order/count (`src/server/home/layout.ts`) |
| Home & Discovery | Show Finish Soon | `PersonalizedHomeSections`'s Finish Soon row visibility |
| Home & Discovery | Default Discover view | `normalizeDiscoverMediaType`'s fallback when `?type=` is absent |
| Home & Discovery | Default Calendar view | `normalizeCalendarView`'s fallback when `?view=` is absent (see docs/calendar.md) |
| General | Reset preferences | Deletes the `user_preferences` row |
| Developer (non-production only) | Add mock data | Seeds real watch/rating/planning rows via the real domain functions |
| Developer (non-production only) | Reset all data | Wipes every table this user owns, except the account itself |

## Home focus semantics

`resolveHomeLayout(focus)` (`src/server/home/layout.ts`, pure) decides
two things only: whether personalized sections render before or after
public discovery sections, and how many public sections show. It never
removes personal sections, and public sections always render even at
"Personal" focus (fewer of them, never zero) — a user with no active
personal content must never see an empty Home.

- **Balanced** — personal first, all five public sections (today's
  default behavior, unchanged).
- **Personal** — personal first, only Trending movies/shows.
- **Discovery** — public sections lead, personal sections follow, all
  five public sections shown.

## Default Save destination

`PlanningControl`'s unsaved state (the one-click Save affordance on Movie/
Show Details) saves straight to `defaultSaveIntent` instead of a hardcoded
"watchlist". The secondary dropdown (once something is saved) still always
offers switching to the other intent — this preference only changes where
the *first* click lands.

## Discover default view

`normalizeDiscoverMediaType(raw, fallback)` takes the preference as its
fallback when `?type=` is absent from the URL; an explicit `?type=` in the
URL always wins. "Remember last used" (a stronger, stateful variant) is a
deliberate cut for this phase — see "Settings considered and cut."

## Settings information architecture

Six categories (`src/features/settings/settings-params.ts`), each real:
General, Appearance, Tracking & Library, Spoilers, Home & Discovery,
Data. `/settings` redirects to `/settings/appearance`.
`/settings/[category]` is real, URL-addressable, back/forward/
refresh-safe — a `layout.tsx` renders the category rail (`SettingsNav`)
beside the active category's content (`page.tsx`'s discriminated
switch).

**Data** (`src/features/settings/data-settings.tsx`) is the odd one out
architecturally — every other category is a set of `UserPreferences`
controls; Data is import/export actions and an import-history/rollback
list, none of it a persisted preference. It's still one of the same six
categories in the same nav, not a separate surface — see
`docs/data-portability.md` for the full domain.

## Visual choice component

`VisualChoice` (`src/features/settings/visual-choice.tsx`) is the one
reusable primitive behind Theme/Density/Motion/Spoiler protection/Home
focus — a real Radix RadioGroup (roving tabindex, one checked value, a
real accessible name per option) with a miniature, decorative preview
beside each option's text label. `TextChoice` is the equivalent for
settings that change interaction behavior rather than layout (Default
Save destination, Default Discover view), where a forced visual preview
would be meaningless. Every visual choice is optimistic — the same
"update immediately, roll back only on real failure" pattern
`MediaRating` already established.

`ThemeMiniPreview` is the one place literal, non-token colors are
deliberately used — see its own comment: the point of that specific
preview is to depict an absolute light/dark appearance regardless of the
settings page's own current ambient theme, which semantic tokens
structurally cannot do.

## Developer tools

A sixth category, "Developer" — local testing tooling, never a real
product surface, and never reachable in a production build:

- **Add mock data** (`src/server/dev-tools/mock-data.ts`) — seeds the
  signed-in account with a curated set of well-known, real TMDB movies
  and one real season each of a few real shows (fetched live, so
  `episodeProviderId`s always match what the real Season page renders —
  a fabricated id would desync watch state from real episodes), plus a
  few ratings and two planning entries. Every write goes through the
  exact same domain functions a real user action calls
  (`recordMovieWatch`, `recordEpisodeWatch`, `setMediaRating`,
  `addToWatchlist`/`addToBacklog`) — this is realistic seed data, not a
  parallel shortcut into the database. One show's season fetch failing
  (e.g. TMDB unreachable) never blocks the rest of the seed.
- **Reset all data** (`src/server/dev-tools/reset-all-data.ts`) — the
  one comprehensive wipe in the app: every table this user owns (watch
  events, show tracking state, ratings, notes, planning items,
  preferences), in one transaction, except the account/session itself.
  Categorically more destructive than General's "Reset preferences"
  (which only ever touches `user_preferences`), so its control requires
  typing a literal confirmation word, not just a confirm dialog.

**Two independent gates**, not one: `isDeveloperSettingsEnabled()`
(`src/features/settings/settings-params.ts`) keeps the category out of
the rendered nav and 404s the route in production — the same mechanism
`/design-system` already uses. `assertDeveloperToolsEnabled()`
(`src/server/dev-tools/guard.ts`) is a second, independent check inside
both mutations themselves, so a production deployment can never run
them even if something upstream skipped the route-level gate.

## Settings considered and cut

Evaluated per the phase spec's own explicit permission to omit a setting
that lacks a real, unambiguous product behavior — never implemented as a
placeholder:

- **Default start page** — conflicts with Home's own `/` route (Home's
  nav link *is* `href="/"`; redirecting `/` elsewhere would make clicking
  "Home" not show Home for some users).
- **Week starts on / Time format / Date style** — Calendar's month view
  (`docs/calendar.md`) deliberately always starts weeks on Sunday rather
  than adding a new preference for it (there was no prior "Week starts
  on" setting to reuse, and one title doesn't justify inventing it), and
  the app still doesn't surface enough clock-time content to justify a
  time-format preference.
- **Artwork emphasis (Immersive/Balanced)** — could not be given a
  materially distinct, coherent rendering within this phase's scope.
- **"After marking watched" behavior**, **rewatch-count visibility
  toggle**, **Library default view**, **quick-actions toggle** — the
  last one explicitly per the phase spec: quick tracking actions are one
  of the product's strongest interactions and stay permanently on, never
  configurable.
- **"Remember last used" Discover view** — a stronger, stateful variant
  of the simpler Movies/Shows default implemented here.
- **Exact per-show completion count**, **notifications, account
  deletion** — still explicitly out of scope. ("Data & Privacy / Danger
  Zone category" and "export" were cut *at the time this was written* —
  a real Data category with import/export now exists; see
  `docs/data-portability.md`. Account deletion remains genuinely
  out of scope, distinct from the Developer category's "Reset all data,"
  which wipes tracked data but keeps the account/session itself.)

## Privacy / caching

Every preference is private, per-user data — `getCurrentUserPreferences`
derives the user from the session and is never shared-cached, same rule
as Tracking/Planning/Opinions. Public TMDB metadata composition elsewhere
in the app is unaffected and remains separately, publicly cacheable.
