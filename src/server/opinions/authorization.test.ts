import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Opinion data (private comments) is private, user-owned data — these
// tests exist specifically to prove one user can never read or mutate
// another user's rows, even when they know the exact media identity.
// See docs/opinions.md, "Privacy / ownership".
vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { setMediaComment, getMediaComment } = await import("./comments");

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

describe("comments", () => {
  it("reads only return the current user's comment", async () => {
    loginAs(userA);
    await setMediaComment({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "User A's comment",
    });

    loginAs(userB);
    expect(await getMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });
});
