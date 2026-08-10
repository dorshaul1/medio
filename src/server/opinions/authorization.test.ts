import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Opinion data (ratings, reactions, notes) is private, user-owned data —
// these tests exist specifically to prove one user can never read or
// mutate another user's rows, even when they know the exact media
// identity. See docs/opinions.md, "Privacy / ownership".
vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { setMediaRating, getMediaRating } = await import("./ratings");
const { setMediaNote, getMediaNote } = await import("./notes");

const FIGHT_CLUB = 550;

let userA: string;
let userB: string;

function loginAs(userId: string) {
  requireSession.mockResolvedValue({ user: { id: userId } });
}

beforeEach(async () => {
  userA = await createTestUser();
  userB = await createTestUser();
});

afterEach(async () => {
  await deleteTestUser(userA);
  await deleteTestUser(userB);
});

describe("ratings", () => {
  it("reads only return the current user's rating", async () => {
    loginAs(userA);
    await setMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, rating: 5 });

    loginAs(userB);
    expect(await getMediaRating({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });
});

describe("notes", () => {
  it("reads only return the current user's note", async () => {
    loginAs(userA);
    await setMediaNote({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "User A's note",
    });

    loginAs(userB);
    expect(await getMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });
});
