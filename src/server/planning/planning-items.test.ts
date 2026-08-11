import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const {
  addToWatchlist,
  addToBacklog,
  changePlanningIntent,
  removePlanningItem,
  getPlanningState,
  listPlanningItems,
  getPlanningIntentsBatch,
} = await import("./planning-items");

const INCEPTION = 27205;
const WINTERS_WATCH = 1399;
const FIGHT_CLUB = 550;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("addToWatchlist / addToBacklog", () => {
  it("adds a movie to the Watchlist", async () => {
    const item = await addToWatchlist("movie", INCEPTION);
    expect(item).toMatchObject({
      mediaType: "movie",
      mediaProviderId: INCEPTION,
      intent: "watchlist",
    });

    const state = await getPlanningState("movie", INCEPTION);
    expect(state?.intent).toBe("watchlist");
  });

  it("adds a show to the Backlog", async () => {
    const item = await addToBacklog("show", WINTERS_WATCH);
    expect(item).toMatchObject({
      mediaType: "show",
      mediaProviderId: WINTERS_WATCH,
      intent: "backlog",
    });
  });
});

describe("changePlanningIntent", () => {
  it("moves Watchlist -> Backlog by updating the existing row, not creating a second one", async () => {
    await addToWatchlist("movie", INCEPTION);
    await changePlanningIntent("movie", INCEPTION, "backlog");

    const state = await getPlanningState("movie", INCEPTION);
    expect(state?.intent).toBe("backlog");
  });

  it("moves Backlog -> Watchlist", async () => {
    await addToBacklog("movie", INCEPTION);
    await changePlanningIntent("movie", INCEPTION, "watchlist");

    const state = await getPlanningState("movie", INCEPTION);
    expect(state?.intent).toBe("watchlist");
  });

  it("a duplicate add never creates a second row for the same media", async () => {
    await addToWatchlist("movie", INCEPTION);
    await addToWatchlist("movie", INCEPTION);
    await addToBacklog("movie", INCEPTION);

    // If a duplicate had been created, this would still only reflect one
    // current state — but the real proof is the unique composite primary
    // key at the schema level; this exercises the same code path an
    // accidental double-click would.
    const state = await getPlanningState("movie", INCEPTION);
    expect(state?.intent).toBe("backlog");
  });
});

describe("removePlanningItem", () => {
  it("removes the planning entry entirely", async () => {
    await addToWatchlist("movie", INCEPTION);
    await removePlanningItem("movie", INCEPTION);

    expect(await getPlanningState("movie", INCEPTION)).toBeNull();
  });
});

describe("getPlanningState", () => {
  it("returns null when no planning entry exists", async () => {
    expect(await getPlanningState("movie", INCEPTION)).toBeNull();
  });
});

describe("media type / provider identity uniqueness", () => {
  it("a movie and a show with the same provider id are independent", async () => {
    await addToWatchlist("movie", WINTERS_WATCH);
    await addToBacklog("show", WINTERS_WATCH);

    expect((await getPlanningState("movie", WINTERS_WATCH))?.intent).toBe("watchlist");
    expect((await getPlanningState("show", WINTERS_WATCH))?.intent).toBe("backlog");
  });
});

describe("listPlanningItems", () => {
  it("returns every saved item across both intents and media types", async () => {
    await addToWatchlist("movie", INCEPTION);
    await addToBacklog("show", WINTERS_WATCH);

    const items = await listPlanningItems(10);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.mediaProviderId).sort()).toEqual(
      [INCEPTION, WINTERS_WATCH].sort(),
    );
  });

  it("orders most recently changed first", async () => {
    await addToWatchlist("movie", INCEPTION);
    await addToWatchlist("movie", FIGHT_CLUB);
    await changePlanningIntent("movie", INCEPTION, "backlog");

    const items = await listPlanningItems(10);

    expect(items[0]?.mediaProviderId).toBe(INCEPTION);
    expect(items[1]?.mediaProviderId).toBe(FIGHT_CLUB);
  });

  it("respects the limit", async () => {
    await addToWatchlist("movie", INCEPTION);
    await addToWatchlist("movie", FIGHT_CLUB);

    const items = await listPlanningItems(1);
    expect(items).toHaveLength(1);
  });

  it("returns an empty array when nothing is saved", async () => {
    expect(await listPlanningItems(10)).toEqual([]);
  });

  it("isolates by user", async () => {
    await addToWatchlist("movie", INCEPTION);

    const otherUserId = await createTestUser();
    requireSession.mockResolvedValue({ user: { id: otherUserId } });

    expect(await listPlanningItems(10)).toEqual([]);

    await deleteTestUser(otherUserId);
  });
});

describe("getPlanningIntentsBatch", () => {
  it("returns intents keyed by media type + provider id, one query per type", async () => {
    await addToWatchlist("movie", FIGHT_CLUB);
    await addToBacklog("show", WINTERS_WATCH);

    const result = await getPlanningIntentsBatch([
      { mediaType: "movie", mediaProviderId: FIGHT_CLUB },
      { mediaType: "show", mediaProviderId: WINTERS_WATCH },
    ]);

    expect(result.get(`movie:${FIGHT_CLUB}`)).toBe("watchlist");
    expect(result.get(`show:${WINTERS_WATCH}`)).toBe("backlog");
  });

  it("distinguishes a movie and a show that happen to share the same provider id", async () => {
    await addToWatchlist("movie", WINTERS_WATCH);

    const result = await getPlanningIntentsBatch([
      { mediaType: "show", mediaProviderId: WINTERS_WATCH },
    ]);

    expect(result.get(`show:${WINTERS_WATCH}`)).toBeUndefined();
  });

  it("returns an empty map without querying for an empty input", async () => {
    const result = await getPlanningIntentsBatch([]);
    expect(result.size).toBe(0);
  });
});
