import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const {
  startWatchingShow,
  putShowOnHold,
  dropShow,
  clearShowTrackingState,
  getShowTrackingState,
  getKnownShowIds,
} = await import("./show-state");
const { recordEpisodeWatch } = await import("./episode-events");

const WINTERS_WATCH = 1399;
const BREAKING_BAD = 1396;
const RICK_AND_MORTY = 60625;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("getShowTrackingState", () => {
  it("returns null when the user has no explicit state for a show", async () => {
    expect(await getShowTrackingState(WINTERS_WATCH)).toBeNull();
  });
});

describe("startWatchingShow", () => {
  it("creates an explicit watching state without any watch history", async () => {
    const state = await startWatchingShow(WINTERS_WATCH);
    expect(state.status).toBe("watching");
  });
});

describe("putShowOnHold", () => {
  it("sets the show to on_hold", async () => {
    await startWatchingShow(WINTERS_WATCH);
    const state = await putShowOnHold(WINTERS_WATCH);
    expect(state.status).toBe("on_hold");
  });

  it("can be set directly without first watching", async () => {
    const state = await putShowOnHold(WINTERS_WATCH);
    expect(state.status).toBe("on_hold");
  });
});

describe("dropShow", () => {
  it("sets the show to dropped", async () => {
    await startWatchingShow(WINTERS_WATCH);
    const state = await dropShow(WINTERS_WATCH);
    expect(state.status).toBe("dropped");
  });
});

describe("resuming", () => {
  it("startWatchingShow moves an on_hold show back to watching", async () => {
    await putShowOnHold(WINTERS_WATCH);
    const state = await startWatchingShow(WINTERS_WATCH);
    expect(state.status).toBe("watching");
  });

  it("startWatchingShow moves a dropped show back to watching", async () => {
    await dropShow(WINTERS_WATCH);
    const state = await startWatchingShow(WINTERS_WATCH);
    expect(state.status).toBe("watching");
  });
});

describe("clearShowTrackingState", () => {
  it("removes the explicit state row entirely", async () => {
    await startWatchingShow(WINTERS_WATCH);
    await clearShowTrackingState(WINTERS_WATCH);

    expect(await getShowTrackingState(WINTERS_WATCH)).toBeNull();
  });

  it("is a no-op when no state exists", async () => {
    await expect(clearShowTrackingState(WINTERS_WATCH)).resolves.toBeUndefined();
  });
});

describe("getKnownShowIds", () => {
  it("includes shows with an explicit tracking state", async () => {
    await startWatchingShow(WINTERS_WATCH);

    const known = await getKnownShowIds([WINTERS_WATCH, BREAKING_BAD]);

    expect(known.has(WINTERS_WATCH)).toBe(true);
    expect(known.has(BREAKING_BAD)).toBe(false);
  });

  it("includes shows with a watched episode but no explicit tracking state", async () => {
    await recordEpisodeWatch({
      showProviderId: BREAKING_BAD,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 62085,
    });

    const known = await getKnownShowIds([BREAKING_BAD, RICK_AND_MORTY]);

    expect(known.has(BREAKING_BAD)).toBe(true);
    expect(known.has(RICK_AND_MORTY)).toBe(false);
  });

  it("returns an empty set for an empty input without querying", async () => {
    const known = await getKnownShowIds([]);
    expect(known.size).toBe(0);
  });

  it("never returns an id outside the requested set", async () => {
    await startWatchingShow(RICK_AND_MORTY);
    const known = await getKnownShowIds([BREAKING_BAD]);
    expect(known.has(RICK_AND_MORTY)).toBe(false);
  });

  it("isolates by user — another user's shows never leak in", async () => {
    await startWatchingShow(WINTERS_WATCH);

    const otherUserId = await createTestUser();
    requireSession.mockResolvedValue({ user: { id: otherUserId } });

    const known = await getKnownShowIds([WINTERS_WATCH]);
    expect(known.has(WINTERS_WATCH)).toBe(false);

    await deleteTestUser(otherUserId);
  });
});
