# MEDIO

A premium personal movies and TV shows application — discovery, tracking, watch
history, and deciding what to watch next.

## Status

**Engineering foundation, testing & CI, a bespoke design system, a
navigable application shell, email/password authentication (Better Auth),
a TMDB media-provider integration, and real Home/Discover product
experiences are all in place** — the four primary routes require a
signed-in session. Home shows current/trending public collections;
Discover is Search plus Movies/Shows genre browsing with dedicated,
sortable, paginated genre pages. Library and Calendar remain placeholders,
and there's no tracking (watch history, watchlists) yet — later phases
will introduce that deliberately. See
[`docs/design-system.md`](docs/design-system.md) for the UI system,
[`/design-system`](http://localhost:3000/design-system) (local development
only) for the live primitive reference, and
[`docs/media-provider.md`](docs/media-provider.md) for the TMDB
integration and Home/Discover architecture.

## Prerequisites

- Node.js `24.19.0` (see [`.nvmrc`](.nvmrc)) — Node 24 LTS
- [pnpm](https://pnpm.io) via [Corepack](https://nodejs.org/api/corepack.html)
  (bundled with Node). This project uses pnpm exclusively — do not use npm or Yarn.

```bash
corepack enable
```

## Installation

```bash
pnpm install
```

## Local development

```bash
pnpm dev:local
```

Starts PostgreSQL (Docker Compose), waits for it to actually be healthy,
applies pending migrations, verifies connectivity, then starts Next.js —
the one command for normal day-to-day development. See
[Database](#database) for what each step does individually, and for the
one-time `.env.local` setup this needs before the first run.

Once Postgres is already running (e.g. it's still up from an earlier
session), plain `pnpm dev` is enough — no need to repeat the setup steps.

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
pnpm format:check   # Biome formatting check
pnpm lint           # Biome lint
pnpm typecheck      # TypeScript, no emit
pnpm test:run       # unit/component tests, single run
pnpm check          # format:check + lint + typecheck + test:run
```

Auto-fixable issues:

```bash
pnpm format         # write formatting fixes
pnpm lint:fix       # write lint fixes
```

## Tests

Unit and component tests use [Vitest](https://vitest.dev) with
[Testing Library](https://testing-library.com) and jsdom. Tests live next to
the code they cover (`component.tsx` / `component.test.tsx`).

```bash
pnpm test           # watch mode
pnpm test:run       # single run (used by pnpm check and CI)
pnpm test:ui        # Vitest's browser UI
```

End-to-end smoke tests use [Playwright](https://playwright.dev) against a
Chromium build of the production app (`pnpm build && pnpm start`), so they
exercise the same artifact that ships. Tests live under [`e2e/`](e2e).

```bash
pnpm test:e2e       # run once
pnpm test:e2e:ui    # Playwright's UI mode
```

`pnpm test:e2e` is not part of `pnpm check` — it builds and boots the app, so
it's run separately and in its own CI job.

## Production build

```bash
pnpm build
pnpm start
```

## Database

PostgreSQL 18 locally via Docker Compose, [Drizzle ORM](https://orm.drizzle.team)
for queries and migrations. See [`docs/database.md`](docs/database.md) for
conventions and architecture.

```bash
cp .env.example .env.local   # DATABASE_URL matches compose.yaml already;
                              # add a generated BETTER_AUTH_SECRET (32+ chars,
                              # e.g. `openssl rand -base64 32`) and BETTER_AUTH_URL
pnpm dev:local                # start PostgreSQL, migrate, verify, then next dev
```

`pnpm dev:local` is `pnpm db:up && pnpm db:migrate && pnpm db:check && pnpm dev`
— each step is also its own script, useful on its own while the app is
already running:

```bash
pnpm db:up            # start PostgreSQL, wait until its healthcheck passes
pnpm db:check         # verify connectivity (SELECT 1)
pnpm db:migrate       # apply migrations (creates the auth tables)
pnpm db:down          # stop PostgreSQL
pnpm db:generate      # generate a migration from the schema
pnpm db:studio        # Drizzle Studio, a local DB browser
pnpm auth:generate    # regenerate auth's schema after changing auth config
```

## Authentication

Email/password via [Better Auth](https://www.better-auth.com) — sign up at
`/sign-up`, sign in at `/sign-in`. The four primary routes (Home, Discover,
Library, Calendar) require a session. See
[`docs/authentication.md`](docs/authentication.md) for the architecture and
the security-boundary principle (route protection is UX, not authorization).

## Media provider (TMDB)

[TMDB](https://www.themoviedb.org) is the external movie/TV metadata
source, integrated behind a server-only boundary (`src/server/tmdb/`) —
raw TMDB shapes never reach product code or the browser. Requires a TMDB
API Read Access Token in `.env.local` (see
[`.env.example`](.env.example)). Verify it's working:

```bash
pnpm tmdb:check
```

See [`docs/media-provider.md`](docs/media-provider.md) for the
architecture, domain models, caching policy, and attribution requirements.

## Continuous integration

GitHub Actions runs on every pull request and push to `main`
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

- **Quality** — install, format check, lint, type check, unit/component
  tests, production build. Uses placeholder (non-secret, non-reachable) env
  values — no database needed for module evaluation at build time.
- **E2E** — install, a disposable Postgres service container, migrations,
  Playwright Chromium, the full E2E suite (including the auth lifecycle).
  Runs independently of the quality job; uploads the HTML report only when
  a run fails.

## Folder structure

```
src/
  app/
    (app)/          # Home, Discover, Library, Calendar — protected, shared shell
    (auth)/         # /sign-in, /sign-up — no shell
    api/auth/       # Better Auth's HTTP handler
    design-system/  # internal design-system preview (not in primary nav)
  components/ui/    # low-level design-system primitives (shadcn-derived)
  components/shell/ # AppShell, DesktopNav, MobileNav, PageContainer, PageHeader,
                     # AccountControl
  components/       # other app-level composed components (theme provider/toggle)
  config/           # application configuration, navigation model, env validation
  lib/              # generic utilities (cn(), auth-client, auth-errors)
  server/db/        # database connection + schema (server-only)
  server/auth/      # Better Auth config + server-side session access (server-only)
  server/media/     # application-owned media domain models
  server/tmdb/      # TMDB integration boundary (server-only, except images.ts)
  test/             # shared test setup (Vitest + Testing Library)
e2e/                # Playwright smoke/navigation/theme/auth tests
scripts/            # standalone tooling (db-check.ts, tmdb-check.ts)
```

`src/features` will be added when there is real content for it — see
[`docs/architecture.md`](docs/architecture.md) for directory ownership,
[`docs/design-system.md`](docs/design-system.md) for the token/theme system,
[`docs/database.md`](docs/database.md) for the database,
[`docs/authentication.md`](docs/authentication.md) for auth, and
[`docs/media-provider.md`](docs/media-provider.md) for the TMDB
integration.

## Environment variables

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
`TMDB_API_TOKEN` — see [`.env.example`](.env.example). Validated with Zod
at server startup (`src/config/env/`); the app fails fast with a clear
error if any are missing or malformed rather than failing confusingly
later. More service-specific variables will be added in later phases,
following the same pattern.
# medio
