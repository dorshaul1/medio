// Loads `.env.local` (the same file — and convention — `db:check`/
// `db:migrate`/`tmdb:check` already use; see docs/database.md) so
// `DATABASE_URL` is available before an integration test imports
// `@/server/db`, which validates required server env at import time.
// `pnpm test`/`test:run` don't load `.env.local` themselves (most tests
// never touch the database), so this must be the *first* import in any
// DB integration test file — ES module imports execute in the order
// they're written, so this runs before the `@/server/db` import that
// follows it. Shared across domains (tracking, planning, ...) — the first
// real second use case promoted this out of `server/tracking/`.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local present — fine in CI, where DATABASE_URL and friends
  // are provided directly via the environment instead.
}
