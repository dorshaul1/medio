# Progressive Web App

MEDIO is installable and works as a standalone application on supported
platforms — this document covers the actual architecture behind that,
not a generic PWA tutorial. PWA capabilities are **progressive
enhancement**: every feature described here degrades gracefully, and
normal browser usage remains fully first-class regardless of Service
Worker/install support (see CLAUDE.md, "PWA").

## Manifest ownership

`src/app/manifest.ts` is the one source of truth — Next's file-convention
manifest route. The framework generates `/manifest.webmanifest` and
injects the `<link rel="manifest">` tag automatically; there is no
static JSON file to keep in sync by hand. `start_url`/`scope` are both
`/`: installed MEDIO launches into the exact same server-side
authenticated/logged-out branch `/` already makes (see
docs/authentication.md, "`/` behavior by auth state") — never a separate
PWA-only start page, never duplicated auth logic.

## App icons

`src/app/icons/_mark.tsx` is the one shared icon mark — three ascending
rounded bars (echoing Stats' own "Viewing rhythm" chart and MEDIO's core
promise of exact, sequential episode tracking), rendered via
`next/og`'s `ImageResponse` at every size:

- `src/app/icon.tsx` — the browser-tab favicon (32×32, Next's `icon.tsx`
  convention).
- `src/app/apple-icon.tsx` — iOS's Home Screen icon (180×180, Next's
  `apple-icon.tsx` convention, auto-injects `<link rel="apple-touch-icon">`).
- `src/app/icons/192/route.tsx`, `.../512/route.tsx` — the manifest's
  "any"-purpose icons.
- `src/app/icons/maskable/route.tsx` — the manifest's maskable icon
  (512×512, with a real safe-zone margin so an arbitrary OS crop shape
  never clips the mark).

All four route handlers are `export const dynamic = "force-static"` —
the output never varies per request, so it renders once at build time
rather than regenerating the same PNG on every request. Colors are
plain hex approximations of the real `--primary`/`--primary-foreground`
tokens (Satori, the renderer behind `ImageResponse`, doesn't support
`oklch()`).

## Viewport and launch metadata

`src/app/layout.tsx` exports `viewport` (light/dark `themeColor` array,
so installed chrome matches whichever real MEDIO surface color is
active) and extends `metadata` with `appleWebApp` (iOS "launch as an
app" metadata — no file-convention equivalent exists) and
`formatDetection: { telephone: false }`. `maximumScale`/`userScalable`
are deliberately never set — disabling pinch-zoom is a real accessibility
regression some outdated PWA guides still recommend.

Theme-flash prevention was already solved before this phase:
next-themes injects a pre-hydration script that sets the `dark` class
before paint (see `src/components/theme-provider.tsx`), so there's
nothing PWA-specific to add there.

## Safe areas

Handled through `env(safe-area-inset-*)`, never a hardcoded device
value:

- `MobileNav` (bottom bar) — `paddingBottom: env(safe-area-inset-bottom)`.
- `AppShell`'s mobile sticky header and `PublicNav` (Landing/auth) —
  `paddingTop: max(<base padding>, env(safe-area-inset-top))`.
- `AppShell`'s content wrapper reserves
  `calc(4rem + env(safe-area-inset-bottom))` of bottom padding on mobile
  (not a fixed `pb-16`) — a fixed value under-reserves on a device with
  a tall Home Indicator, letting the last bit of page content sit
  partly behind the nav bar.
- `public/offline.html` applies the same pattern for its own standalone
  static page.

`Dialog` already used `max-h-[calc(100dvh-4rem)] overflow-y-auto` and
`dvh` (not `vh`) before this phase; a dedicated mobile bottom-sheet
primitive was considered and deliberately not built — see "Deferred"
below.

## iOS zoom prevention

`Input`/`Textarea` render at `text-base` (16px) below the `sm:`
breakpoint, `sm:text-sm` (14px) above it — iOS Safari auto-zooms the
whole page on focus for any input under 16px. Fixed through real
typography, never a viewport `user-scalable=no`/`maximum-scale` hack
(which would disable pinch-zoom entirely).

## Service Worker strategy

`public/sw.js` — a small, hand-written, framework-free worker (no
`next-pwa`/Workbox dependency; see CLAUDE.md, "Don't add a dependency
without a clear, current need" — a vanilla worker fully covers MEDIO's
deliberately narrow caching needs). Registered only in production
(`src/components/pwa-manager.tsx`'s `useEffect`, gated on
`NODE_ENV === "production"`), so local development never sees stale
cached bundles.

### Cache boundary — the critical privacy rule

- **Never intercepted at all**: every non-GET request (all mutations),
  and every GET request outside the two safe categories below — API
  routes, RSC/data payloads, TMDB images, auth endpoints. The worker's
  `fetch` handler doesn't even inspect these; they hit the network
  exactly as if no Service Worker existed.
- **Runtime-cached (cache-first)**: two narrow, genuinely public/
  immutable categories only — Next's own content-hashed
  `/_next/static/` build assets, and this app's own static icon/
  manifest routes (`/icons/*`, `/icon`, `/apple-icon`,
  `/manifest.webmanifest`). Both are safe by construction: neither can
  ever contain a user's private data, and hashed asset URLs change on
  every deploy that changes their content, so a cache-first policy is
  always correct.
- **Precached, one file**: `/offline.html` — the one thing that must
  work with zero network at all.
- **Never cached**: any navigation (HTML page) response. Every MEDIO
  page is per-request/session-dependent (Home, Library, Diary, Stats,
  Settings, ...); caching one would risk showing stale or, worse,
  another account's private content. Navigations are network-first,
  falling back to `/offline.html` only when the network genuinely fails.

This means account-switch privacy holds by construction, not by extra
logic: since nothing personalized is ever cached, there is nothing to
invalidate on logout. Verified in `e2e/pwa.spec.ts` — sign in as one
account, sign out, sign in as a different account, confirm zero trace
of the first account's identity remains, with the Service Worker
genuinely active throughout.

### Offline experience

`public/offline.html` — plain, self-contained HTML/CSS (no build
pipeline, no external font/script requests, which would themselves fail
offline), approximating MEDIO's real light/dark palette via
`prefers-color-scheme` directly (next-themes' own script can't run
here). MEDIO does not attempt full offline functionality — see
CLAUDE.md, "Offline mutations": a mutation attempted offline simply
fails at the network layer (this Service Worker never intercepts it),
so the UI never falsely reports success. There is no offline mutation
queue, no background sync, no conflict resolution.

### Update lifecycle

A newly installed worker deliberately does **not** call
`self.skipWaiting()` on install — it stays in the browser's normal
"waiting" state until the page explicitly asks it to take over. `
src/components/pwa-manager.tsx` watches for a waiting worker and shows
a restrained "A new version of MEDIO is ready. [Refresh]" banner;
clicking it `postMessage`s `"SKIP_WAITING"` to the worker, which then
activates and triggers `controllerchange`, which the page listens for to
reload exactly once. This is never automatic — user data safety (an
in-progress note, form, or Settings change) always wins over activating
an update immediately. `activate` deletes every previously-versioned
cache (`CACHE_VERSION` in `sw.js`), so old assets never accumulate
across deploys.

## Install promotion policy

Two genuinely different concepts, modeled as two separate types rather
than one conflated boolean (`src/features/install/install-policy.ts`):

- **Installability** — whether the browser/platform can technically
  install MEDIO at all. MEDIO never degrades this: the manifest and
  Service Worker stay fully standards-based on every platform, desktop
  included, and a desktop browser's own native install affordance (a
  Chrome address-bar icon, a browser menu item, ...) is never suppressed
  or interfered with.
- **Install promotion** — whether *MEDIO's own UI* should show an
  installation action right now. This is the one place a deliberate
  product decision lives: MEDIO actively promotes installation on
  mobile (Landing + Settings), and shows **no** MEDIO-owned install UI
  on desktop at all, regardless of whether the desktop browser could
  technically install it. Desktop users who want to install MEDIO
  still can, entirely through their browser's own native mechanism —
  MEDIO simply never spends its own product UI asking them to.

`InstallPromotionState` (`install-policy.ts`) is the single source of
truth for this: `"not-promoted"` (desktop), `"installed"` (mobile,
already standalone — no redundant action), `"direct"` (mobile, a real
`beforeinstallprompt` is available), `"manual"` (mobile, no programmatic
prompt — iOS Safari), `"unsupported"` (mobile, neither path exists — no
broken/dead UI). `deriveInstallPromotionState` is a pure function from
`InstallCapability` (the raw observed facts) to this state — fully unit-
tested (`install-policy.test.ts`) independent of any browser API.

### Shared install domain

`src/features/install/install-provider.tsx`'s `InstallProvider` —
mounted once in the root layout (alongside `ThemeProvider`, wrapping
both the public Landing page and the authenticated shell) — is the one
place `beforeinstallprompt`/`appinstalled` are ever listened for. Both
mobile Settings (`features/settings/install-app-setting.tsx`) and
mobile Landing (`features/landing/mobile-install-action.tsx`) read the
same state through `useInstall()`, never a second independent listener
or a duplicated platform check in either page component. The deferred
prompt event itself is kept in a `ref`, not React state — a live browser
event object isn't serializable render data, and Chrome only allows it
to be used once.

### Mobile — the two real surfaces

- **Settings → General** — `InstallAppSetting`. Renders nothing at all
  for `"not-promoted"`/`"installed"`/`"unsupported"`; a `SettingRow`
  with an "Install" button for `"direct"`; a `SettingRow` with a "How to
  install" button opening `InstallInstructionsDialog` for `"manual"`.
- **Landing** — a dedicated, deliberately small section
  ("MEDIO, one tap away") between the History section and the Final CTA
  — a premium convenience layer, never presented at the same visual
  weight as Tracking/Pick for Me (see CLAUDE.md, "Landing"). The section
  copy and illustration (`MobileInstallIllustration`) render
  unconditionally — a plain, true product fact any visitor can read;
  `MobileInstallAction` (the same `"direct"`/`"manual"` button pair as
  Settings) only mounts real content on mobile.

`InstallInstructionsDialog` (`features/install/`) is the one shared
manual-install surface both pages reuse — a plain `Dialog`, not a
dedicated bottom-sheet primitive, documentation page, or wizard (see
CLAUDE.md, "Avoid speculative abstractions"): one short instruction
doesn't justify a new primitive, and `Dialog` already handles this
comfortably.

### Desktop

No MEDIO-owned install button, no install instructions, no install
banner — anywhere. Landing's mobile-install section still renders on
desktop (the copy/illustration are genuinely useful desktop-read product
information: "MEDIO also lives on your phone"), just with no action
beneath it. Settings → General never renders `InstallAppSetting`'s row
at all on desktop.

### Never automatic

The browser's own install UI is only ever invoked from a real click on
MEDIO's own "Install"/"How to install" control — never on page load,
never after sign-up/login, never as a recurring nag. There is exactly
one desktop policy and one mobile policy; no per-page reinterpretation.

## Production-only registration, local testing

The Service Worker only registers when `NODE_ENV === "production"`.
To exercise real PWA behavior locally: `pnpm build && pnpm start`, the
same production artifact `e2e/pwa.spec.ts` already runs against (see
playwright.config.ts's `webServer` — every Playwright run already uses
a real production build).

## Deferred / considered and cut

- **A dedicated mobile bottom-sheet primitive** for large dialogs —
  `Dialog` (already scrolls internally, already width-constrained,
  already used successfully across this app's confirmations) was judged
  sufficient; a new primitive needs a real, specific screen that needs
  it, not a blanket "sheets are more native" argument (see CLAUDE.md,
  "Avoid speculative abstractions").
- **Full offline functionality / background sync / an offline mutation
  queue** — explicitly out of scope; MEDIO's offline behavior is a
  graceful degradation, not an offline-first architecture.
- **Push notifications** — no infrastructure exists or was added.
- **A native splash-screen component** — platforms that generate one
  from manifest/icon metadata already do; MEDIO doesn't delay real
  content to show a logo animation.
- **Real-device manual QA** (a physical iPhone/Android install,
  Lighthouse's own installability audit UI) was not performed in this
  pass — verification here is limited to automated Playwright coverage
  against a real production build (manifest/icon content, offline
  fallback, update-banner logic, account-switch privacy) plus responsive
  viewport screenshots. This is an honest limitation, not a claim of
  full device coverage.
