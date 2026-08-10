// Entrypoint for `@better-auth/cli generate` only (see package.json's
// `auth:generate` script) — never imported by the app. The CLI runs
// through its own standalone Node loader, not Next.js's bundler, so (like
// drizzle.config.ts) it reads env with the pure parser and builds its own
// throwaway Pool rather than importing the app's `server-only`-guarded
// `db`/`auth` singletons, which would throw here for the same reason
// documented in drizzle.config.ts.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { parseServerEnv } from "../../config/env/schema";
import { createAuth } from "./config";

const env = parseServerEnv(process.env);
const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool);

export const auth = createAuth(db, env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL);
