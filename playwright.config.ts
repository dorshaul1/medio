import { defineConfig, devices } from "@playwright/test";
import { TMDB_MOCK_SERVER_PORT } from "./e2e/tmdb-mock-server-port";

const baseURL = "http://localhost:3000";
const STORAGE_STATE = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The HTML report is only worth generating in CI, where a human isn't
  // watching the terminal and may need to inspect a failure afterwards.
  reporter: process.env.CI ? "html" : "list",
  // Playwright's default worker count scales with host CPU count, which
  // can overwhelm the lightweight local TMDB fixture server (and the
  // single `next start` process every worker shares) on a high-core-count
  // machine — observed as sporadic "element not found" failures under
  // full default parallelism, gone at a capped worker count. A modest cap
  // keeps runs deterministic without materially slowing CI down. Omitted
  // (not set to `undefined`) outside CI, since `workers` doesn't accept an
  // explicit `undefined` under `exactOptionalPropertyTypes`.
  ...(process.env.CI ? { workers: 4 } : {}),
  // Starts a local fixture server standing in for TMDB — see
  // e2e/tmdb-mock-server.ts for why Discover/search coverage needs this
  // rather than page.route() interception.
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    // Signs up one throwaway user and saves the session — the primary
    // destinations require auth, so everything except auth.spec.ts (which
    // exercises the sign-up/sign-in flow itself, and must start signed out)
    // runs against that saved session instead of repeating sign-up per test.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "authenticated",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      testIgnore: /auth\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /auth\.spec\.ts/,
    },
  ],
  // Smoke tests run against a production build so they exercise the same
  // artifact that ships, not the dev server's extra HMR/overlay behavior.
  // Locally, an already-running server on baseURL is reused for fast
  // iteration; CI always builds and starts fresh for a deterministic run.
  webServer: {
    command: "pnpm build && pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Only takes effect when Playwright actually spawns this process (i.e.
    // not when reusing an already-running local dev server) — see
    // docs/media-provider.md, "Verifying connectivity", for that tradeoff.
    // `E2E_TEST_RUN` is a hard safety rail, not a feature flag — see
    // src/config/env/schema.ts's `assertSafeDatabaseUrlForE2e` and
    // docs/production.md, "Production database safety guards": the app
    // refuses to boot under this flag unless DATABASE_URL is local.
    env: {
      TMDB_API_BASE_URL_OVERRIDE: `http://127.0.0.1:${TMDB_MOCK_SERVER_PORT}/3`,
      E2E_TEST_RUN: "1",
    },
  },
});
