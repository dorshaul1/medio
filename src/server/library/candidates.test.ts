import "@/server/test-support/test-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requireSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ requireSession: () => requireSession() }));

const { createTestUser, deleteTestUser } = await import("@/server/test-support/test-db");
const { listLibraryCandidates, getWatchedEpisodeCountsByShow } = await import("./candidates");
const { addToWatchlist, addToBacklog } = await import("@/server/planning/planning-items");
const { recordMovieWatch } = await import("@/server/tracking/movie-events");
const { recordEpisodeWatch } = await import("@/server/tracking/episode-events");
const { startWatchingShow, putShowOnHold } = await import("@/server/tracking/show-state");

const FIGHT_CLUB = 550;
const DARK_KNIGHT = 155;
const WINTERS_WATCH = 1399;
const BREAKING_BAD = 1396;

let userId: string;

beforeEach(async () => {
  userId = await createTestUser();
  requireSession.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("listLibraryCandidates", () => {
  it("returns a planned movie, a watched movie, and a tracked show together", async () => {
    await addToWatchlist("movie", FIGHT_CLUB);
    await recordMovieWatch({ movieProviderId: DARK_KNIGHT });
    await startWatchingShow(WINTERS_WATCH);

    const { candidates, hasMore } = await listLibraryCandidates({
      userId,
      sort: "recently_active",
      limit: 10,
      offset: 0,
    });

    expect(hasMore).toBe(false);
    expect(candidates).toHaveLength(3);

    const byId = new Map(candidates.map((c) => [c.mediaProviderId, c]));
    expect(byId.get(FIGHT_CLUB)).toMatchObject({ kind: "planned-movie", intent: "watchlist" });
    expect(byId.get(DARK_KNIGHT)).toMatchObject({ kind: "watched-movie", watchCount: 1 });
    expect(byId.get(WINTERS_WATCH)).toMatchObject({
      kind: "tracked-show",
      trackingStatus: "watching",
    });
  });

  it("filters by media type", async () => {
    await addToWatchlist("movie", FIGHT_CLUB);
    await addToBacklog("show", WINTERS_WATCH);

    const { candidates } = await listLibraryCandidates({
      userId,
      mediaType: "show",
      sort: "recently_active",
      limit: 10,
      offset: 0,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.mediaType).toBe("show");
  });

  it("filters by raw state", async () => {
    await addToWatchlist("movie", FIGHT_CLUB);
    await addToBacklog("movie", DARK_KNIGHT);

    const { candidates } = await listLibraryCandidates({
      userId,
      state: "backlog",
      sort: "recently_active",
      limit: 10,
      offset: 0,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.mediaProviderId).toBe(DARK_KNIGHT);
  });

  it("filters watched movies via the 'watched' state", async () => {
    await recordMovieWatch({ movieProviderId: FIGHT_CLUB });
    await addToWatchlist("movie", DARK_KNIGHT);

    const { candidates } = await listLibraryCandidates({
      userId,
      state: "watched",
      sort: "recently_active",
      limit: 10,
      offset: 0,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.mediaProviderId).toBe(FIGHT_CLUB);
  });

  it("filters tracked shows by explicit tracking status", async () => {
    await startWatchingShow(WINTERS_WATCH);
    await startWatchingShow(BREAKING_BAD);
    await putShowOnHold(BREAKING_BAD);

    const { candidates } = await listLibraryCandidates({
      userId,
      state: "on_hold",
      sort: "recently_active",
      limit: 10,
      offset: 0,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.mediaProviderId).toBe(BREAKING_BAD);
  });

  it("paginates with a bounded query, reporting hasMore without a full count", async () => {
    await addToWatchlist("movie", FIGHT_CLUB);
    await addToBacklog("movie", DARK_KNIGHT);
    await addToWatchlist("show", WINTERS_WATCH);

    const page = await listLibraryCandidates({
      userId,
      sort: "recently_active",
      limit: 2,
      offset: 0,
    });

    expect(page.candidates).toHaveLength(2);
    expect(page.hasMore).toBe(true);
  });

  it("a user with nothing planned or tracked gets an empty page", async () => {
    const { candidates, hasMore } = await listLibraryCandidates({
      userId,
      sort: "recently_active",
      limit: 10,
      offset: 0,
    });
    expect(candidates).toHaveLength(0);
    expect(hasMore).toBe(false);
  });
});

describe("getWatchedEpisodeCountsByShow", () => {
  it("counts distinct watched episodes per show, excluding Specials, from one bulk query", async () => {
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 1,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 1,
      episodeNumber: 2,
      episodeProviderId: 2,
    });
    await recordEpisodeWatch({
      showProviderId: WINTERS_WATCH,
      seasonNumber: 0,
      episodeNumber: 1,
      episodeProviderId: 3,
    });

    const counts = await getWatchedEpisodeCountsByShow(userId, [WINTERS_WATCH]);
    expect(counts.get(WINTERS_WATCH)).toBe(2);
  });

  it("returns an empty map for an empty show id list without querying", async () => {
    const counts = await getWatchedEpisodeCountsByShow(userId, []);
    expect(counts.size).toBe(0);
  });
});
