import { z } from "zod";

// Pure schema/parser — no process.env access here, so it's testable with
// plain input objects. The validated server singleton (./server.ts) is the
// only thing that reads real environment variables.
export const serverEnvSchema = z.object({
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "DATABASE_URL must be a postgresql:// connection string",
  }),
  // Better Auth signs/encrypts sessions with this — 32 random bytes
  // (base64) is Better Auth's own recommended minimum strength.
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url({ error: "BETTER_AUTH_URL must be a valid URL" }),
  // TMDB's API Read Access Token (a long JWT, from the developer's own TMDB
  // account — see docs/media-provider.md). Server-only: never sent to the
  // browser, never logged.
  TMDB_API_TOKEN: z.string().min(1, "TMDB_API_TOKEN is required"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(source);
}

// Better Auth's `baseURL` must match the origin the request actually
// arrived on, or it rejects the request — see docs/production.md,
// "Authentication". An explicit `BETTER_AUTH_URL` always wins (this is
// how Production is configured — a fixed canonical domain). Vercel
// injects `VERCEL_URL` (host only, no protocol) into every deployment,
// production and Preview alike, so falling back to it here means every
// Preview deployment authenticates correctly against its own unique URL
// without a per-preview environment variable. Pure — takes a plain env
// object, never reads `process.env` itself (see schema.ts's own
// discipline above).
export function resolveBetterAuthUrl(
  source: Record<string, string | undefined>,
): string | undefined {
  if (source.BETTER_AUTH_URL) return source.BETTER_AUTH_URL;
  if (source.VERCEL_URL) return `https://${source.VERCEL_URL}`;
  return undefined;
}

// Better Auth's origin check (CSRF protection) rejects any state-
// changing request (sign-in, sign-out, ...) whose `Origin` header
// doesn't match `baseURL` exactly — see docs/production.md/
// docs/authentication.md. Two real, recurring reasons that legitimate
// same-app traffic doesn't:
//
// - Locally, port 3000 is frequently already taken by something else on
//   the developer's machine; `next dev` silently binds the next free
//   port (3001, 3002, ...) instead of failing, but `.env.local`'s
//   `BETTER_AUTH_URL` stays fixed at `http://localhost:3000` — a real
//   mismatch, not a misconfiguration, and one a developer has no reason
//   to notice until a sign-in/sign-out 403s. Trusting any `localhost`
//   port unconditionally (not just outside production) is safe: no
//   genuine external visitor's browser ever sends `Origin:
//   http://localhost:*` to a deployed server.
// - On Vercel, one deployment is served behind several real hostnames at
//   once — the canonical production alias (what `BETTER_AUTH_URL` is set
//   to), the team/project aliases, and a unique per-deployment hash —
//   see docs/production.md, "Multiple hostnames and trustedOrigins".
//   Scoped to the `medio-*` prefix specifically (this app's own Vercel
//   project alias naming) — never a bare `*.vercel.app`, which would
//   trust every other project on the platform too. Detected via `VERCEL`
//   (only ever set by Vercel's own build/runtime environment).
export function computeTrustedOrigins(source: Record<string, string | undefined>): string[] {
  const origins = ["http://localhost:*"];
  if (source.VERCEL === "1") origins.push("https://medio-*.vercel.app");
  return origins;
}

// A hard safety rail against E2E ever mutating a real (let alone
// production) database — see docs/production.md, "Production database
// safety guards". `playwright.config.ts`'s `webServer` is the only place
// that sets `E2E_TEST_RUN=1`; every E2E run boots the app with it, so
// this fires on every server start under test and refuses to proceed
// unless `DATABASE_URL` is unambiguously local. There is no bypass flag
// — a genuine need to point E2E elsewhere means changing this function,
// not routing around it.
export function assertSafeDatabaseUrlForE2e(
  source: Record<string, string | undefined>,
  databaseUrl: string,
): void {
  if (source.E2E_TEST_RUN !== "1") return;

  const hostname = new URL(databaseUrl).hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error(
      `Refusing to run E2E tests against a non-local database (host: ${hostname}). ` +
        "E2E mutates real data — it must only ever run against the local/CI Postgres instance.",
    );
  }
}
