import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/config/env/server";
import * as schema from "@/server/db/schema";

declare global {
  // Dev-only hot-reload guard — see the comment below.
  var pgPool: Pool | undefined;
}

// Next.js reloads server modules on every save in development. Without
// this, each reload would create a brand new Pool while the previous one's
// connections are never released, quickly exhausting Postgres' connection
// limit. Stashing the pool on globalThis survives the reload. Production
// has no hot reload, so it always gets one pool per process regardless.
const pool = globalThis.pgPool ?? new Pool({ connectionString: env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalThis.pgPool = pool;
}

export const db = drizzle(pool, { schema });

// The exact type `db.transaction`'s callback receives — derived from `db`
// itself rather than importing a drizzle-orm internal type, so it can
// never drift from the real one. For domain functions that need to accept
// either `db` or an in-flight transaction (e.g. a cross-domain write that
// must commit atomically with a caller's own transaction) — see
// `server/planning/planning-items.ts`'s `clearPlanningItem`.
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
