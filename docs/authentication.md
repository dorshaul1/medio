# Authentication

## Stack

[Better Auth](https://www.better-auth.com) with the Drizzle/PostgreSQL
adapter (`better-auth/adapters/drizzle`) — the only auth system. Scope for
now: email/password sign-up, sign-in, sign-out, server-side sessions.

## Server/client boundary

- **`src/server/auth/config.ts`** — pure factory (`createAuth(db, secret, baseURL)`),
  no env/db imports. Defines *what* auth does (email/password enabled) exactly
  once, shared by both entrypoints below.
- **`src/server/auth/index.ts`** — the real app instance. `server-only`,
  imports the app's guarded `db` and `env` singletons. Everything in the
  running app (the API route, `session.ts`) imports `auth` from here.
- **`src/server/auth/cli.ts`** — a second, standalone instance used only by
  `pnpm auth:generate` (the Better Auth CLI). It runs through the CLI's own
  Node loader, not Next's bundler, so — like `drizzle.config.ts` — it reads
  env with the pure parser and opens its own throwaway `Pool` rather than
  importing the `server-only`-guarded singletons, which would throw there
  for the same reason documented in `drizzle.config.ts`. Never imported by
  the app.
- **`src/lib/auth-client.ts`** — the browser client (`better-auth/react`).
  Must never import database or server-env modules; nothing in it does.
- **`src/server/auth/session.ts`** — the only place `headers()` is forwarded
  to Better Auth for session validation. `getCurrentSession()` returns the
  session or `null`; `requireSession()` redirects to `/sign-in` if there
  isn't one.

## Security boundary — read this before adding user-owned data

**Route protection is a UX convenience, not authorization.** The `(app)`
route group's layout calls `requireSession()` and redirects unauthenticated
visitors to `/sign-in` — that decides what a browser gets to *see*, not
what the server allows.

Any future server code that reads or writes user-owned data (a watch event,
a list, a note — anything scoped to "this user") **must independently call
`getCurrentSession()`/`requireSession()` at that point** and derive the user
ID from the validated session. Never trust a user ID from a form field, a
query parameter, client state, or "the page was behind the layout redirect"
as a substitute for that check. The layout redirect and the data-access
check are two different concerns that happen to both exist today; only the
second one is actually load-bearing for security.

## `/` behavior by auth state

`/` is the one route that must never simply redirect: a logged-out visitor
gets the public Landing page (`src/features/landing/landing-page.tsx`), a
signed-in visitor gets Home — both rendered by the same
`src/app/page.tsx`, branching on `getCurrentSession()` server-side before
anything paints (no flash of the wrong experience either way). This is why
Home no longer lives inside the `(app)` route group: that group's layout
unconditionally requires a session for everything in it, which is exactly
the "redirect a logged-out visitor away" behavior `/` must never get. Home's
actual composition lives in `src/features/home/home-page.tsx` so `/`'s
session branching doesn't need to know anything about Home's own internals.

## Protected routes

Two layers, deliberately redundant:

1. **`src/proxy.ts`** — a fast, edge-level guard for every other primary
   destination (Discover, Library, Movies, People, Pick, Settings, Shows,
   Stats, Calendar — an explicit allow-list, `/` is deliberately absent).
   Checks only whether a session cookie is *present* (`better-auth/cookies`'
   `getSessionCookie`, no DB call, no signature verification — Better
   Auth's own documented pattern for this) and, if not, redirects to
   `/sign-in?next=<the original path>` before the page starts rendering at
   all. This is a UX convenience, not the security boundary — see below.
2. **`requireSession()`** (`src/app/(app)/layout.tsx`) — the existing
   per-layout check for every route still inside the `(app)` group,
   unchanged. Defense in depth: if proxy's matcher ever has a gap (a new
   route added without updating it), this still catches it, just without
   preserving a return path.

An already-authenticated visitor hitting `/sign-in` or `/sign-up` is
redirected away before rendering too — each page now does this itself
(`src/app/(auth)/_lib/resolve-auth-page-next.ts`), not a shared `(auth)`
layout, because **Next.js layouts don't receive `searchParams`, only pages
do** — the old shared-layout approach couldn't have honored `?next=` even
if it tried.

### Return URL safety

`?next=` is never trusted blindly. `src/lib/safe-redirect.ts`'s
`isSafeReturnPath`/`safeReturnPath` reject anything that isn't a genuine
same-origin relative path — a full external URL, a protocol-relative
`//evil.com`, a backslash-prefixed `/\evil.com` (some browsers treat that
as protocol-relative too), or a loop back to `/sign-in`/`/sign-up` itself.
An invalid/missing `next` silently falls back to `/`, never a 400 and never
a redirect to somewhere an attacker chose. `resolveAuthPageNext` (the
"already authenticated" redirect) and Sign In's own post-auth
`router.push` both go through this validation before it's ever used.

**Sign In honors `next`; Sign Up never does.** A returning user's `next`
genuinely means "take me back to where I was" — Sign In's form pushes to
the validated `next` on success. A brand-new account has no "where I
was" to return to, so `SignUpForm` always pushes to `/` (Home)
regardless of `next`; the sign-up page still resolves and validates
`next` for one narrower purpose — carrying it through the "Already have
an account? Log in" switch link, so *that* flow (which goes through Sign
In) still honors it.

### Logout destination

Logging out always returns to the public Landing page (`/`), never back to
`/sign-in` — see `src/components/shell/account-control.tsx`. `authClient.
signOut` uses Better Auth's `fetchOptions.onSuccess` callback (not a bare
`.then()`, which would leave the button looking like it did nothing if the
request ever failed) to navigate via a hard `window.location.href = "/"`,
not `router.push`/`router.refresh()` — being already on `/` (the single
most common place to click Sign out from) would make a client-side push to
the same URL a no-op, leaving the stale authenticated shell on screen even
though the session was genuinely cleared server-side. A full reload has no
such edge case: every bit of client state is wiped and `/` is re-requested
from the server fresh.

That hard reload clears everything held in memory (React state/Context),
but the one thing that survives a page reload — `localStorage` — needs an
explicit clear: `onSuccess` also calls `clearRecentSearches()`
(`src/features/search/recent-searches.ts`), the one piece of personal
state this app keeps client-side rather than in the database. Without it,
GlobalSearch's recent search terms would otherwise leak from one account
into a different account signing in on the same device/browser.

## Schema & migrations

Auth tables (`user`, `session`, `account`, `verification`) live in
`src/server/db/schema/auth.ts`, generated by Better Auth's own Drizzle
schema generator:

```bash
pnpm auth:generate   # regenerate after changing auth config
pnpm db:generate      # then generate the migration, as usual
pnpm db:migrate
```

The generated file was hand-reviewed and only one change applied on top of
it: every `timestamp` column got `{ withTimezone: true }`, to match this
project's `timestamptz` convention (see `docs/database.md`) — Better Auth's
generator doesn't set that by default. If you re-run `auth:generate`, reapply
that adjustment (there's a comment at the top of the file as a reminder).
No product-specific columns were added to these tables — that's owned by
future domains, not auth.

Better Auth generates its own `text` primary keys (its own ID scheme) for
these tables — that's independent of the "identifier strategy not decided
yet" note in `docs/database.md`, which is about *our* future domain tables.

## Environment

`BETTER_AUTH_SECRET` (min 32 characters) and `BETTER_AUTH_URL` extend the
existing validated environment (`src/config/env/`) alongside `DATABASE_URL`
— one schema, fails fast on import if anything is missing/malformed. Never
read via `process.env` directly outside that boundary.

Locally, `pnpm dev` needs `.env.local` with real values (copy
`.env.example` and add a generated `BETTER_AUTH_SECRET` — `openssl rand
-base64 32` or equivalent). Never commit `.env.local`, never log the secret.

## UI

`src/app/(auth)/` — the auth screens, deliberately outside the application
shell (no sidebar/nav). Composition is asymmetric, not the centered-card
template: on `sm+` screens the form sits left in generous negative space;
mobile centers it, since there's no room for that asymmetry there.
`AuthScreen` (`src/app/(auth)/_components/auth-screen.tsx`) carries real
brand presence — the real MEDIO wordmark linking back to `/`, plus one
contextual line of copy per screen — rather than a plain text label, so the
auth flow reads as a focused extension of the public Landing page instead
of an anonymous form. Built entirely from existing `src/components/ui/`
primitives (`Button`, `Input`, the new `PasswordInput`) — no parallel
form/button system.

`PasswordInput` (visibility toggle) was added as a `ui/` primitive, not an
auth-local component, since any future password field needs the same
behavior — it has a `/design-system` entry.

Errors from Better Auth are mapped through `src/lib/auth-errors.ts`
(`mapAuthErrorCode`) to short, non-technical copy — raw Better Auth/database
error text is never shown to a user.

## Account control

The shell's secondary area (bottom of the desktop rail, mobile header
strip) shows the signed-in user's name (or email) and a sign-out control —
`src/components/shell/account-control.tsx`. No avatar (a generated
placeholder would look accidental, not designed), no account dropdown menu
— sign-out is the only action there today.

## Deferred

Deliberately not implemented — each needs real infrastructure
(transactional email) or a concrete future requirement first:

- **Password reset / "Forgot password?"** — evaluated during the public
  Landing/auth redesign and deliberately not added. Better Auth's
  email/password config (`src/server/auth/config.ts`) has no
  `sendResetPassword` configured, and MEDIO has no transactional email
  provider at all — implementing this honestly would require standing up
  real email infrastructure first, not just adding a UI form. A dead
  "Forgot password?" link that goes nowhere real would be worse than no
  link, so Sign In has none. Revisit once an email provider is a real
  requirement.
- Email verification
- Social/OAuth login, passkeys, MFA
- Organizations, roles/permissions, admin accounts
- Real Settings functionality, onboarding, avatar upload
