// Shared between global-setup.ts (starts the server) and
// playwright.config.ts (points the app under test at it) so the port only
// lives in one place.
export const TMDB_MOCK_SERVER_PORT = 4319;
