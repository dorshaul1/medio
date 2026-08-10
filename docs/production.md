# Production

MEDIO's public deployment — infrastructure, environment, deployment
workflow, and the free-tier constraints that come with it. See
`docs/database.md` for schema/migration conventions and
`docs/authentication.md` for auth architecture; this file is about where
those things actually run.

## Architecture

```
Browser
  → Vercel (Next.js, Node.js runtime, region: fra1 / Frankfurt)
      → Neon PostgreSQL (aws-eu-central-1 / Frankfurt)
      → TMDB (server-side only, never proxied through our own API)
```

No self-hosted server, no Docker in production, no reverse proxy, no
Redis. The application and database are both fully managed — see
"Free tier" below for what that trades away.

## Infrastructure

- **Vercel project**: `medio-app` (team: `dorshaul1s-projects`) — not
  `medio`. The original `medio` project got into a state where every
  deployment after its first stayed stuck (`readyState: BLOCKED`)
  indefinitely; a side-by-side test proved the same code deployed fine
  under a fresh project name, so `medio-app` is the real one going
  forward. The old `medio` project was left alone rather than force-
  removed (see "Known issues" below) — it's inert and costs nothing.
- **Production domain**: `https://medio-app-delta.vercel.app` (the
  canonical Vercel-assigned domain — no custom domain purchased, see
  "Future domain" below)
- **Function region**: `fra1` (Frankfurt) — set via `vercel.json`'s
  `regions`, chosen to sit next to the database region below rather than
  Vercel's own default (`iad1`, US East). The primary user is in Israel;
  Frankfurt is the closest Vercel-supported region to both the user and
  the database. Hobby plan supports a single function region (any one
  region, not just the default) — this is a real, $0 configuration
  choice, not a paid regional feature.
- **Neon project**: `MEDIO` (org: personal account)
- **Neon region**: `aws-eu-central-1` (Frankfurt) — the same latency
  reasoning as the function region above; keeping compute and database in
  the same region minimizes the DB round-trip Vercel's own docs call out
  as the main latency lever.
- **PostgreSQL version**: 18 (matches `compose.yaml`'s local development
  image exactly — see `docs/database.md`)
- **Database/role**: database `medio`, role `medio_owner` (Neon's default
  naming for a database of that name) — no additional databases created.

## Environment variables

Names only — values live only in Vercel's Production environment
configuration, never in git, never in this file. See
`src/config/env/schema.ts` for the validated shape.

| Variable              | Source                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`         | Neon's **pooled** (PgBouncer) connection string for the `medio` database, with `sslmode=verify-full` explicit (avoids a `pg` deprecation warning on every DB-touching request — see "Database connection strategy"). |
| `BETTER_AUTH_SECRET`   | Freshly generated for production (`openssl rand -base64 32`-equivalent) — deliberately **not** reused from local development. |
| `BETTER_AUTH_URL`      | The canonical production domain (`https://medio-app-delta.vercel.app`). Preview deployments don't need their own value: `src/config/env/schema.ts`'s `resolveBetterAuthUrl` falls back to Vercel's own `VERCEL_URL` when unset. |
| `TMDB_API_TOKEN`       | Reused from local development — the same TMDB Read Access Token works for any deployment. |

No other environment variables exist. `E2E_TEST_RUN`,
`TMDB_API_BASE_URL_OVERRIDE`, and `VERCEL_URL`/`VERCEL_ENV`/`VERCEL` are
either test-only (never set in Vercel) or automatically injected by the
platform itself — none are configured by hand.

## Database connection strategy

`src/server/db/index.ts` uses a plain `pg.Pool` via
`drizzle-orm/node-postgres` — unchanged from local development, per
CLAUDE.md's "node-postgres driver is the only query layer." This is safe
on Vercel's serverless Node.js runtime specifically because `DATABASE_URL`
is Neon's **pooled** endpoint (PgBouncer, `-pooler` in the hostname): the
pooler multiplexes real Postgres connections behind it, so a `pg.Pool`
opened per warm function instance never risks exhausting Postgres' own
connection limit the way it would against a direct connection under
serverless's "many concurrent short-lived instances" model.

Migrations use the **direct** (unpooled) connection instead — deliberately,
one-off, from a developer machine (see "Migrations" below) — since
`drizzle-kit migrate` needs the advisory-lock/session semantics a
transaction-mode pooler doesn't reliably support.

## Multiple hostnames and `trustedOrigins`

Better Auth's origin-check middleware (CSRF protection) 403s any state-
changing request — including sign-out — whose `Origin` header doesn't
match `baseURL` exactly. Two real cases hit this, not just a theoretical
one:

- **Locally**: port 3000 is often already taken by something else on a
  developer's machine, so `next dev` silently binds the next free port
  (3001, 3002, ...) — but `.env.local`'s `BETTER_AUTH_URL` stays fixed at
  `http://localhost:3000`. This produced a real, reproduced 403
  (`Invalid origin: http://localhost:3001` in the server log) purely from
  port drift, nothing actually misconfigured.
- **On Vercel**: one deployment is served behind several real hostnames
  at once — the canonical production alias, the team/project aliases,
  and a unique per-deployment hash — while `baseURL` is necessarily fixed
  to exactly one of them.

`src/server/auth/config.ts`'s `createAuth` accepts a `trustedOrigins`
list; `src/config/env/schema.ts`'s `computeTrustedOrigins` always
includes `http://localhost:*` (safe unconditionally — no genuine external
visitor's browser ever sends that Origin to a deployed server) and adds
`["https://medio-*.vercel.app"]` on Vercel (detected via the always-
injected `VERCEL=1`) — scoped to the `medio` name prefix shared by every
project alias this app has ever used (`medio`, `medio-app`, ...), never a
bare `*.vercel.app` (which would trust every other project on the
platform too). The Vercel case was verified directly against the live
deployment (a real sign-up → sign-out round trip via `curl`, both 200) —
not just reasoned about.

## Deployment

**Git-based (normal workflow)**: push or merge to `main` (the actual
production branch — confirmed via `git branch --show-current`/`git remote
-v`) is intended to trigger an automatic Vercel Production deployment —
**not yet connected**, see "Known issues" below.

**Manual (CLI fallback, what's actually been used so far)**:

```bash
pnpm deploy:vercel
```

(`package.json`'s `deploy:vercel` script — deliberately not named plain
`deploy`, which is a reserved `pnpm` built-in command for monorepo
package publishing, unrelated to this. Runs `vercel deploy --prod
--yes` directly if you'd rather not go through pnpm.)

Requires the Vercel CLI authenticated (`vercel whoami`) and the project
linked (`.vercel/project.json`, already gitignored).

## Known issues

- **GitHub auto-deploy is not connected.** `vercel git connect` fails
  with "Failed to connect dorshaul1/medio to project" for both the
  original and the replacement project. This means the Vercel GitHub App
  either isn't installed on the `dorshaul1` GitHub account, or is
  installed without access granted to the `medio` repository. Fixing
  this needs a browser action on GitHub (installing/authorizing the
  Vercel GitHub App for this repo) that isn't reachable from the CLI —
  see the repo's GitHub → Settings → Integrations, or start from
  Vercel's own dashboard "Connect Git Repository" flow, which will
  prompt the same GitHub authorization if it's genuinely missing.
- **Only a project's first-ever production deployment reliably
  completes.** Every deployment attempted after a project's first stays
  at `readyState: BLOCKED` indefinitely — the build itself finishes and
  reports `READY` within seconds, but the deployment never promotes or
  starts serving, `vercel promote` explicitly refuses it ("not ready and
  cannot be promoted"), and this was reproduced identically across two
  separate projects (`medio`, then `medio-app`) and multiple isolated
  variables (with/without `vercel.json`'s region config, with/without
  `src/proxy.ts`) — ruling out anything in this codebase as the cause. A
  brand-new, unrelated throwaway project deployed instantly with no
  such issue, which points at new-account-specific throttling on this
  Vercel account rather than a per-project or per-code problem. This
  will most likely clear on its own after the account ages / completes
  whatever verification Vercel's fraud-prevention system wants — check
  `https://vercel.com/dorshaul1s-projects/medio-app/deployments` for
  any prompt/banner before assuming it's still broken.
- **Practical effect until it clears**: the app is fully live and
  correct at `https://medio-app-delta.vercel.app` (verified — see
  "Verification performed" below), but every further change requires
  redeploying, and redeploys are the thing currently blocked. Until this
  resolves, ship several changes at once rather than deploying after
  each one.

## Verification performed

Real HTTP requests against the live deployment (not just "the build
succeeded"):

- `GET /` → 200, renders the public Landing page for a logged-out
  request.
- `GET /sign-in`, `/sign-up`, `/api/health`, `/robots.txt`, `/icon` → 200.
- `GET /library` (no session cookie) → 307 to `/sign-in?next=%2Flibrary`
  — `src/proxy.ts`'s redirect-with-return-path, confirmed live.
- `POST /api/auth/sign-up/email` → 200, created a real user row in the
  production Neon database (cleaned up afterward — see below).
- `POST /api/auth/sign-out` (with that user's session cookie, `Origin:
  https://medio-app-delta.vercel.app`) → 200 — the exact flow that was
  403ing before `computeTrustedOrigins` shipped.
- `vercel logs` inspected directly — no unexpected errors; the only
  recurring warning was the `pg` SSL-mode deprecation notice, since fixed
  by making `sslmode=verify-full` explicit in `DATABASE_URL` (see
  "Environment variables" above).
- The one QA account created during this verification was deleted
  directly from the production database (`user`/`session`/`account` rows
  for that one row, matched by its exact email) immediately after —
  production contains no test data.

## Migrations

**Explicit, deliberate, developer-run — never automatic on deploy.**
Running `drizzle-kit migrate` from every concurrent serverless build
would risk two builds racing the same migration; Vercel builds are not a
safe place for this. The actual workflow:

1. Change `src/server/db/schema/*`.
2. `pnpm db:generate` — review the generated SQL (as always, see
   `docs/database.md`).
3. Commit the migration.
4. Before/alongside deploying that change to production, run migrations
   once against Neon's **direct** connection string, from a developer
   machine or a deliberate one-off CI step — never the app's own runtime
   `DATABASE_URL` (which is the pooled one):

   ```bash
   DATABASE_URL="<neon direct connection string>" \
     node node_modules/drizzle-kit/bin.cjs migrate
   ```

   (`drizzle.config.ts` validates the full server env schema, not just
   `DATABASE_URL` — supply syntactically-valid placeholder values for the
   other required variables if running this outside an environment that
   already has them, exactly as done for the very first production
   migration.)
5. Only then does the new schema need to be live for the corresponding
   application code to deploy successfully.

Production begins clean — no seed data, no fixtures (the one QA account
created while verifying this setup was deleted immediately after — see
"Verification performed"). `pnpm db:generate`/`db:migrate`/`db:studio`
all read `DATABASE_URL` from `.env.local` — the production connection
string must never be written there (see "Production database safety
guards" below).

## Production database safety guards

- **Developer settings' "Developer" tools** (mock data seed, full account
  reset) are already double-gated by `NODE_ENV === "production"` — both
  at the route/nav level (`isDeveloperSettingsEnabled`) and inside the
  mutations themselves (`assertDeveloperToolsEnabled`). Next.js sets
  `NODE_ENV=production` for every Vercel build (Preview and Production
  alike), so these are already unreachable on any deployed instance —
  see CLAUDE.md, "Settings".
- **E2E tests can never accidentally target a real database.**
  `src/config/env/schema.ts`'s `assertSafeDatabaseUrlForE2e` is a hard
  crash-on-boot guard: `playwright.config.ts`'s `webServer.env` sets
  `E2E_TEST_RUN=1` on every server instance Playwright spawns, and the app
  refuses to start under that flag unless `DATABASE_URL`'s host is
  `localhost`/`127.0.0.1`. There is no bypass flag.
- **The production `DATABASE_URL` must never be written to `.env.local`**
  — this is the one guard that's procedural, not code-enforced (a
  developer's own local Postgres is always what `.env.local` should point
  at). If it ever needs to be used from a local machine (e.g. running a
  one-off migration), pass it inline on the command's own environment
  (`DATABASE_URL="..." pnpm ...`), never persisted to a file.
- **Tests never open a real database connection at all** — confirmed no
  `src/**/*.test.ts(x)` file imports `@/server/db` directly; the pure/I-O
  separation discipline (see CLAUDE.md, "Engineering") means unit/
  component tests exercise pure functions or mock the DB module, never a
  live connection.

## Health check

`GET /api/health` — a minimal liveness/readiness endpoint for external
monitoring (a real HTTP boundary, not something a Server Component could
call directly). Runs `SELECT 1` against the database and returns `{
"status": "ok" }` (200) or `{ "status": "error" }` (503) — nothing else.
Never caches (`Cache-Control: no-store`), never returns schema details,
environment values, or provider tokens. Confirmed 200 against production.

## Logs

```bash
vercel logs medio-app                    # recent production logs
vercel logs <specific-deployment-url>    # logs for one deployment
```

Also browsable at the deployment's `Inspect` URL (printed by every
`vercel deploy`/shown in `vercel ls`/`vercel inspect`).

## Free tier

- **Vercel Hobby** is intended for personal/non-commercial use — MEDIO is
  deployed under that assumption. If MEDIO becomes a commercial product,
  that triggers a separate hosting/plan decision, not a default upgrade.
- **Neon Free** scales compute to zero after a period of inactivity. The
  first request after a cold period pays a real, user-visible wake-up
  latency — this is accepted deliberately in exchange for $0 cost, a
  fully managed database, and zero server administration. No cron
  pings, scheduled health-check traffic, or other artificial keep-alive
  mechanism was added to work around this — that would be fighting the
  architecture's own intentional tradeoff. If this becomes genuinely
  disruptive in real usage, upgrading (or moving to always-on compute)
  is a deliberate future decision, not an automatic one.
- Both plans were used entirely within their free allowances — no paid
  add-on, no upgrade, was enabled at any point in this setup.

## Future domain

No custom domain was purchased — MEDIO is fully usable at
`https://medio-app-delta.vercel.app`. To add one later:

```bash
vercel domains add <yourdomain.com>
```

then follow the DNS instructions Vercel prints, and update the
`BETTER_AUTH_URL` production environment variable to the new domain
before/alongside pointing DNS at it (Better Auth's `baseURL` must always
match the real serving origin — see docs/authentication.md).
