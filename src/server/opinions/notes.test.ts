import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { setMediaNote, clearMediaNote, getMediaNote } = await import("./notes");
const { NOTE_MAX_LENGTH } = await import("./types");

const FIGHT_CLUB = 550;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("setMediaNote", () => {
  it("creates a note", async () => {
    const note = await setMediaNote({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "Loved the ending.",
    });
    expect(note?.content).toBe("Loved the ending.");
  });

  it("updates the existing note in place — never a second row", async () => {
    await setMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, content: "First take." });
    const updated = await setMediaNote({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "Revised take.",
    });

    expect(updated?.content).toBe("Revised take.");
    const stored = await getMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });
    expect(stored?.content).toBe("Revised take.");
  });

  it("trims surrounding whitespace", async () => {
    const note = await setMediaNote({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "  Great cinematography.  ",
    });
    expect(note?.content).toBe("Great cinematography.");
  });

  it("whitespace-only content deletes the note rather than storing an empty row", async () => {
    await setMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, content: "Real note" });
    const result = await setMediaNote({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "   ",
    });

    expect(result).toBeNull();
    expect(await getMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });

  it("rejects content over the length limit", async () => {
    await expect(
      setMediaNote({
        mediaType: "movie",
        mediaProviderId: FIGHT_CLUB,
        content: "a".repeat(NOTE_MAX_LENGTH + 1),
      }),
    ).rejects.toThrow();
  });

  it("accepts content at exactly the length limit", async () => {
    const note = await setMediaNote({
      mediaType: "movie",
      mediaProviderId: FIGHT_CLUB,
      content: "a".repeat(NOTE_MAX_LENGTH),
    });
    expect(note?.content).toHaveLength(NOTE_MAX_LENGTH);
  });
});

describe("clearMediaNote", () => {
  it("removes the note", async () => {
    await setMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB, content: "Note" });
    await clearMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB });

    expect(await getMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });

  it("is a no-op when no note exists", async () => {
    await expect(
      clearMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB }),
    ).resolves.not.toThrow();
  });
});

describe("getMediaNote", () => {
  it("returns null when no note exists", async () => {
    expect(await getMediaNote({ mediaType: "movie", mediaProviderId: FIGHT_CLUB })).toBeNull();
  });
});
