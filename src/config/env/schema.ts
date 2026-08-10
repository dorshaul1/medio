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
