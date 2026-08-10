import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const getCurrentSession = vi.fn();
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({
  getCurrentSession: () => getCurrentSession(),
  requireSession: () => requireSession(),
}));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { DEFAULT_PREFERENCES, fetchUserPreferences } = await import("./queries");
const { updatePreferences, resetPreferences } = await import("./mutations");

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  getCurrentSession.mockResolvedValue({ user: { id: userId } });
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("fetchUserPreferences", () => {
  it("returns product defaults for a signed-out visitor", async () => {
    getCurrentSession.mockResolvedValue(null);
    expect(await fetchUserPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("returns product defaults before any preference row exists", async () => {
    expect(await fetchUserPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("reflects a stored preference", async () => {
    await updatePreferences({ theme: "dark" });
    const preferences = await fetchUserPreferences();
    expect(preferences.theme).toBe("dark");
    // Every untouched column still reads its own default.
    expect(preferences.density).toBe(DEFAULT_PREFERENCES.density);
  });
});

describe("updatePreferences", () => {
  it("creates the row on the first change", async () => {
    await updatePreferences({ density: "compact" });
    expect((await fetchUserPreferences()).density).toBe("compact");
  });

  it("updates the same row in place on a later change — never a second row", async () => {
    await updatePreferences({ theme: "dark" });
    await updatePreferences({ theme: "light" });

    const preferences = await fetchUserPreferences();
    expect(preferences.theme).toBe("light");
  });

  it("never affects another user's preferences", async () => {
    const otherUserId = await createTestUser();
    try {
      requireSession.mockResolvedValue({ user: { id: otherUserId } });
      await updatePreferences({ theme: "dark" });

      requireSession.mockResolvedValue({ user: { id: userId } });
      getCurrentSession.mockResolvedValue({ user: { id: userId } });
      expect((await fetchUserPreferences()).theme).toBe(DEFAULT_PREFERENCES.theme);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("resetPreferences", () => {
  it("restores every preference to its default", async () => {
    await updatePreferences({ theme: "dark", density: "compact", spoilerProtection: "strict" });
    await resetPreferences();

    expect(await fetchUserPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("is a no-op when no preference row exists", async () => {
    await expect(resetPreferences()).resolves.not.toThrow();
  });
});
