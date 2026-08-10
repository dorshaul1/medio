import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Pure factory — no env/db singleton imports here, so it can be shared by
// both the real app entrypoint (./index.ts, server-only) and the
// standalone Better Auth CLI entrypoint (./cli.ts) without either one
// depending on the other's wiring. Keeps the actual auth config (which
// features are enabled) defined exactly once.
export function createAuth<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  secret: string,
  baseURL: string,
) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
    },
  });
}
