import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Pure factory — no env/db singleton imports here, so it can be shared by
// both the real app entrypoint (./index.ts, server-only) and the
// standalone Better Auth CLI entrypoint (./cli.ts) without either one
// depending on the other's wiring. Keeps the actual auth config (which
// features are enabled) defined exactly once.
//
// `trustedOrigins` exists because Vercel serves one deployment behind
// *multiple* real hostnames at once (the canonical production alias, the
// team/project aliases, and a unique per-deployment hash — see
// docs/production.md) while `baseURL` is necessarily fixed to exactly
// one of them. Without this, Better Auth's origin-check middleware
// (CSRF protection) 403s any state-changing request — including sign-out
// — made from an origin that doesn't equal `baseURL`, even though it's
// genuinely this same deployment.
export function createAuth<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  secret: string,
  baseURL: string,
  trustedOrigins: readonly string[] = [],
) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret,
    baseURL,
    ...(trustedOrigins.length > 0 ? { trustedOrigins: [...trustedOrigins] } : {}),
    emailAndPassword: {
      enabled: true,
    },
  });
}
