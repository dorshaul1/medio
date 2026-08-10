// Standalone connectivity/config check: `pnpm tmdb:check`. Runs outside
// Next.js's bundler (via tsx), so — like drizzle.config.ts and
// scripts/db-check.ts — it validates env with the pure schema/parser
// rather than importing the app's `server-only`-guarded TMDB client, and
// makes its own one-off request instead of reusing app wiring that a
// one-shot script doesn't need.
import { parseServerEnv } from "../src/config/env/schema";

async function main() {
  const env = parseServerEnv(process.env);

  // The lightest authenticated TMDB endpoint there is — it does nothing
  // but confirm the token works, so this never dumps real catalog data.
  const response = await fetch("https://api.themoviedb.org/3/authentication", {
    headers: {
      Authorization: `Bearer ${env.TMDB_API_TOKEN}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`TMDB responded ${response.status} ${response.statusText}`);
  }

  const body: unknown = await response.json();
  const success = Boolean(
    body && typeof body === "object" && "success" in body && body.success === true,
  );

  if (!success) {
    throw new Error("TMDB responded 200 but did not confirm success");
  }

  console.log("TMDB reachable, token valid.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`TMDB check failed: ${message}`);
  process.exitCode = 1;
});
