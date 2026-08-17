import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
const getCurrentSession = vi.fn();
vi.mock("@/server/auth/session", () => ({
  requireSession: () => requireSession(),
  getCurrentSession: () => getCurrentSession(),
}));

const getMovieDetails = vi.fn();
const getShowDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
}));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { recordMovieWatch } = await import("@/server/tracking/movie-events");
const { setMediaComment } = await import("@/server/opinions/comments");
const { addToWatchlist } = await import("@/server/planning/planning-items");
const { buildNativeExport } = await import("./native");
const { NATIVE_EXPORT_SCHEMA_VERSION } = await import("./types");

const FIGHT_CLUB = 550;
const SE7EN = 807;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
  getCurrentSession.mockResolvedValue({ user: { id: userId } });
  getMovieDetails.mockReset();
  getShowDetails.mockReset();
  getMovieDetails.mockImplementation(async (id: number) => ({
    id,
    title: id === FIGHT_CLUB ? "Fight Club" : "Se7en",
    releaseYear: id === FIGHT_CLUB ? 1999 : 1995,
  }));
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("buildNativeExport", () => {
  it("is versioned and stamped with an export time", async () => {
    const result = await buildNativeExport();
    expect(result.schemaVersion).toBe(NATIVE_EXPORT_SCHEMA_VERSION);
    expect(new Date(result.exportedAt).getTime()).not.toBeNaN();
  });

  it("returns an empty-but-valid export for a user with no history", async () => {
    const result = await buildNativeExport();
    expect(result.data.movieWatchEvents).toEqual([]);
    expect(result.data.episodeWatchEvents).toEqual([]);
    expect(result.data.preferences).toBeNull();
  });

  it("includes real external identity plus hydrated title/year fallback metadata", async () => {
    await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date("2026-08-01T10:00:00Z"),
    });
    const result = await buildNativeExport();
    expect(result.data.movieWatchEvents).toEqual([
      {
        movieProviderId: FIGHT_CLUB,
        title: "Fight Club",
        year: 1999,
        watchedAt: "2026-08-01T10:00:00.000Z",
      },
    ]);
  });

  it("hydrates each distinct title only once across many rows", async () => {
    await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date("2026-01-01T10:00:00Z"),
    });
    await recordMovieWatch({
      movieProviderId: FIGHT_CLUB,
      watchedAt: new Date("2026-08-01T10:00:00Z"),
    });
    await setMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, content: "Great." });

    await buildNativeExport();
    expect(getMovieDetails).toHaveBeenCalledTimes(1);
  });

  it("excludes preferences by default", async () => {
    const result = await buildNativeExport();
    expect(result.data.preferences).toBeNull();
  });

  it("includes preferences only when explicitly opted in", async () => {
    const result = await buildNativeExport(true);
    expect(result.data.preferences).not.toBeNull();
    expect(result.data.preferences?.theme).toBe("system");
  });

  it("exports planning items with their own hydrated identity", async () => {
    await addToWatchlist("movie", SE7EN);
    const result = await buildNativeExport();
    expect(result.data.planningItems).toEqual([
      {
        mediaType: "movie",
        mediaProviderId: SE7EN,
        title: "Se7en",
        year: 1995,
        intent: "watchlist",
      },
    ]);
  });

  it("never includes auth/session fields anywhere in the output", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    const result = await buildNativeExport(true);
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/password|secret|session|token/i);
  });
});
