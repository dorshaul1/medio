import { defineConfig } from "drizzle-kit";
// The pure schema/parser, not `@/config/env/server` — this file runs
// through Drizzle Kit's own standalone runner, not Next.js's bundler, so
// the `server-only` guard (which relies on Next's "react-server" resolution
// condition) would throw here rather than protect anything.
import { parseServerEnv } from "./src/config/env/schema";

const env = parseServerEnv(process.env);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
