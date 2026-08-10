import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { setMediaRating, clearMediaRating, getMediaRating } = await import("./ratings");
const { recordMovieWatch } = await import("@/server/tracking/movie-events");

const FIGHT_CLUB = 550;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("setMediaRating", () => {
  it("sets a new rating", async () => {
    const rating = await setMediaRating({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      rating: 4,
    });
    expect(rating.rating).toBe(4);

    const stored = await getMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });
    expect(stored?.rating).toBe(4);
  });

  it("updates the existing rating in place — never a second row", async () => {
    await setMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, rating: 3 });
    const updated = await setMediaRating({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      rating: 5,
    });

    expect(updated.rating).toBe(5);
    const stored = await getMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });
    expect(stored?.rating).toBe(5);
  });

  it("supports Show ratings independently of Movie ratings", async () => {
    await setMediaRating({ mediaType: "movie", mediaProviderId: 1399, rating: 2 });
    await setMediaRating({ mediaType: "show", mediaProviderId: 1399, rating: 5 });

    const movieRating = await getMediaRating({ mediaType: "movie", mediaProviderId: 1399 });
    const showRating = await getMediaRating({ mediaType: "show", mediaProviderId: 1399 });
    expect(movieRating?.rating).toBe(2);
    expect(showRating?.rating).toBe(5);
  });

  it.each([0, 6, -1, 3.5])("rejects an out-of-range or non-integer rating (%s)", async (rating) => {
    await expect(
      setMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, rating }),
    ).rejects.toThrow();
  });

  it("a rating survives a rewatch", async () => {
    await setMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, rating: 4 });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });

    const stored = await getMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });
    expect(stored?.rating).toBe(4);
  });
});

describe("clearMediaRating", () => {
  it("removes the rating", async () => {
    await setMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, rating: 4 });
    await clearMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });

    const stored = await getMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });
    expect(stored).toBeNull();
  });

  it("is a no-op when no rating exists", async () => {
    await expect(
      clearMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB }),
    ).resolves.not.toThrow();
  });
});

describe("getMediaRating", () => {
  it("returns null when unrated", async () => {
    expect(await getMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });
});
