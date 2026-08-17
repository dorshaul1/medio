# Database

## Stack

- **PostgreSQL 18** — local development via Docker Compose (`compose.yaml`).
- **Drizzle ORM** (`drizzle-orm/node-postgres`) — the only query layer.
- **node-postgres** (`pg`) — the only driver, one `Pool` per process.

## Local development

```bash
pnpm db:up      # start PostgreSQL (docker compose up -d)
pnpm db:check   # verify connectivity (SELECT 1)
pnpm db:logs    # follow PostgreSQL logs
pnpm db:down    # stop it
```

`compose.yaml` runs PostgreSQL only — the Next.js app keeps running directly
via `pnpm dev`, not in a container. The database is bound to
`127.0.0.1:5432`, uses a named volume (`postgres-data`) for persistence, and
has a real `pg_isready` healthcheck (`docker compose up -d` returns once
Postgres is actually ready, not just once the container has started).

Local credentials (`untitled` / `untitled` / db `untitled`) are intentionally
non-secret development defaults matching `DATABASE_URL` in `.env.example` —
copy that to `.env.local` before starting the app or running any `db:*`
command. They mean nothing for a real deployment.

## Schema changes

The workflow is always: **edit schema → generate → review → migrate.**

1. Add or change a table in `src/server/db/schema/` (create a domain file
   and re-export it from `schema/index.ts`). For auth's own tables, change
   `src/server/auth/config.ts` instead and run `pnpm auth:generate` to
   regenerate `schema/auth.ts` — see `docs/authentication.md`.
2. `pnpm db:generate` — Drizzle Kit diffs the schema against
   `drizzle/` and writes a new SQL migration file.
3. **Read the generated SQL.** Drizzle Kit is a helpful diffing tool, not an
   authority on intent — review it like any other code change.
4. Commit the migration file.
5. `pnpm db:migrate` — applies pending migrations.

`pnpm db:studio` opens Drizzle Studio (a local, developer-only DB browser —
not part of the application) for inspecting data by hand.

There is no `db:push` script and no automatic schema mutation on app
boot — migrations are the only sanctioned way the schema changes, in every
environment including production.

## Conventions

- **Naming:** PostgreSQL tables and columns are `snake_case`; the Drizzle
  schema maps them to `camelCase` TypeScript identifiers. Table exports use
  descriptive domain names (e.g. `users`, not `tbl_user`).
- **Timestamps:** use `timestamptz` for anything that represents a real
  moment in time. Never store timestamps as formatted strings or naive
  local time.
- **Constraints:** use real database constraints (foreign keys, `NOT NULL`,
  `UNIQUE`, etc.) for invariants the database can reliably guarantee —
  don't push that entirely into application code.
- **Indexes:** added based on actual query/access patterns when a domain
  schema lands, not preemptively.
- **Identifiers (primary keys):** the first real product domain (tracking
  — see `docs/tracking.md`) uses `uuid` primary keys with
  `.defaultRandom()` (native `gen_random_uuid()`, no extension needed on
  PostgreSQL 13+) for rows a user needs a stable, independent ID to later
  edit or delete (`movie_watch_events`, `episode_watch_events`). A row
  whose own natural identity *is* a unique key pair — `show_tracking_state`
  — uses a composite primary key on that pair instead of a surrogate ID;
  see the schema file's own comment for why. (Auth's own tables — `user`,
  `session`, etc. — already use Better Auth's own generated `text` IDs;
  that's a separate, settled decision scoped to those tables. See
  `docs/authentication.md`.) Future product schemas should default to
  `uuid` unless a table has a similarly strong reason not to.
  `media_planning_items` (the planning domain — see `docs/library.md`)
  follows the same composite-key reasoning as `show_tracking_state`: a
  user has at most one current planning entry per media identity, that
  triple *is* the row's natural identity, and nothing else ever
  references it by an independent id.

## Architecture

- **Server-only.** Database code lives under `src/server/db/` and imports
  `server-only`, so an accidental import from a Client Component fails the
  build instead of silently bundling database code into the browser.
- **One driver, one pool.** `node-postgres` only; a single `pg.Pool`,
  reused across Next.js dev-mode hot reloads via a `globalThis` guard (see
  the comment in `src/server/db/index.ts`) so reloading doesn't leak
  connections. Production gets one pool per process, no special-casing.
- **No generic repository layer.** Drizzle is already a typed query layer —
  no `BaseRepository`/`DatabaseService`/`UnitOfWork`. Domain-specific query
  functions live near the server/domain feature that owns them, once one
  exists.
- **No transaction helpers yet** — use Drizzle's native transaction API
  directly when a real multi-step atomic operation exists.
- **Data ownership:** our PostgreSQL database owns users, auth-related
  application state, watch state/history, lists, comments, preferences,
  and other application-owned metadata. External media
  providers (e.g. TMDB) own media metadata — we do not mirror their entire
  catalog into PostgreSQL. External media IDs and our user-owned state are
  kept as separate, deliberately-linked concerns, not merged.
- **Standalone tooling** (`drizzle.config.ts`, `scripts/db-check.ts`) reads
  and validates `DATABASE_URL` independently of the app's `server-only`
  boundary — those run through Drizzle Kit's/tsx's own Node process, not
  Next.js's bundler, so they use the pure schema/parser
  (`src/config/env/schema.ts`) and manage their own short-lived connection
  rather than importing the app's guarded singleton.

See [`docs/architecture.md`](architecture.md) for how this fits into the
overall server/client boundary.
