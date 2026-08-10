import type { Server } from "node:http";
import { startTmdbMockServer } from "./tmdb-mock-server";
import { TMDB_MOCK_SERVER_PORT } from "./tmdb-mock-server-port";

// Starts once for the whole E2E run — see tmdb-mock-server.ts for why
// Discover/search coverage needs a real local server rather than
// page.route() interception, and playwright.config.ts for how the app
// under test is pointed at it (TMDB_API_BASE_URL_OVERRIDE).
export default async function globalSetup() {
  const server: Server = await startTmdbMockServer(TMDB_MOCK_SERVER_PORT);

  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };
}
