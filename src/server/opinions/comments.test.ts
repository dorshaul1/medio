import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { setMediaComment, clearMediaComment, getMediaComment } = await import("./comments");
const { COMMENT_MAX_LENGTH } = await import("./types");

const FIGHT_CLUB = 550;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("setMediaComment", () => {
  it("creates a comment", async () => {
    const comment = await setMediaComment({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "Loved the ending.",
    });
    expect(comment?.content).toBe("Loved the ending.");
  });

  it("updates the existing comment in place — never a second row", async () => {
    await setMediaComment({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "First take.",
    });
    const updated = await setMediaComment({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "Revised take.",
    });

    expect(updated?.content).toBe("Revised take.");
    const stored = await getMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });
    expect(stored?.content).toBe("Revised take.");
  });

  it("trims surrounding whitespace", async () => {
    const comment = await setMediaComment({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "  Great cinematography.  ",
    });
    expect(comment?.content).toBe("Great cinematography.");
  });

  it("whitespace-only content deletes the comment rather than storing an empty row", async () => {
    await setMediaComment({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "Real comment",
    });
    const result = await setMediaComment({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "   ",
    });

    expect(result).toBeNull();
    expect(await getMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });

  it("rejects content over the length limit", async () => {
    await expect(
      setMediaComment({
        mediaType: "movie",
        mediaProviderId: FIGHT_CLUB,
        content: "a".repeat(COMMENT_MAX_LENGTH + 1),
      }),
    ).rejects.toThrow();
  });

  it("accepts content at exactly the length limit", async () => {
    const comment = await setMediaComment({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "a".repeat(COMMENT_MAX_LENGTH),
    });
    expect(comment?.content).toHaveLength(COMMENT_MAX_LENGTH);
  });
});

describe("clearMediaComment", () => {
  it("removes the comment", async () => {
    await setMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, content: "Comment" });
    await clearMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });

    expect(await getMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });

  it("is a no-op when no comment exists", async () => {
    await expect(
      clearMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB }),
    ).resolves.not.toThrow();
  });
});

describe("getMediaComment", () => {
  it("returns null when no comment exists", async () => {
    expect(await getMediaComment({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });
});
