// Standalone connectivity check: `pnpm db:check`. Runs outside Next.js's
// bundler (via tsx), so — like drizzle.config.ts — it validates env with
// the pure schema/parser rather than importing the `server-only`-guarded
// app module, and manages its own short-lived Pool rather than reusing the
// app's dev hot-reload singleton (which a one-shot script doesn't need).
import { Pool } from "pg";
import { parseServerEnv } from "../src/config/env/schema";

async function main() {
  const env = parseServerEnv(process.env);
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    await pool.query("SELECT 1");
    console.log("Database reachable.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database check failed: ${message}`);
  process.exitCode = 1;
});
