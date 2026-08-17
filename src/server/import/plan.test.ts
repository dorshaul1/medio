import { describe, expect, it } from "vitest";
import { buildImportPlan, type ResolvedRecord } from "./plan";
import type { ParsedImportRecord, ResolvedIdentity } from "./types";

// Deliberately not typed as `ExistingUserState` here — that type declares
// its fields as `ReadonlyMap`/`ReadonlySet` (the real production shape),
// but these tests need to mutate the maps directly to set up fixtures.
// A plain `Map`/`Set` is structurally assignable to `ExistingUserState`
// at the `buildImportPlan` call site either way.
function emptyState() {
  return {
    movieWatchedAtByMovie: new Map<number, Date[]>(),
    episodeWatchedAtByEpisode: new Map<string, Date[]>(),
    planningIntentByMedia: new Map<string, "watchlist" | "backlog">(),
    trackingStatusByShow: new Map<number, "watching" | "on_hold" | "dropped">(),
    hasCommentForMedia: new Set<string>(),
  };
}

const RESOLVED_MOVIE: ResolvedIdentity = {
  status: "resolved",
  mediaType: "movie",
  providerId: 550,
  title: "Fight Club",
  year: 1999,
  poster: null,
};

const RESOLVED_SHOW: ResolvedIdentity = {
  status: "resolved",
  mediaType: "show",
  providerId: 1399,
  title: "Winter's Watch",
  year: 2011,
  poster: null,
};

function movieWatch(
  watchedAt: Date,
  precision: "exact" | "dateOnly" = "dateOnly",
): ParsedImportRecord {
  return {
    kind: "movieWatch",
    identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: 1999 },
    watchedAt,
    datePrecision: precision,
  };
}

function episodeWatch(
  seasonNumber: number,
  episodeNumber: number,
  watchedAt: Date,
): ParsedImportRecord {
  return {
    kind: "episodeWatch",
    identity: { kind: "titleYear", mediaType: "show", title: "Winter's Watch", year: 2011 },
    seasonNumber,
    episodeNumber,
    episodeProviderId: null,
    watchedAt,
    datePrecision: "dateOnly",
  };
}

describe("buildImportPlan — movie watch duplicate detection", () => {
  it("creates a new watch event when the date is genuinely new", () => {
    const plan = buildImportPlan(
      [{ record: movieWatch(new Date("2026-08-01T12:00:00Z")), resolved: RESOLVED_MOVIE }],
      emptyState(),
    );
    expect(plan.entries[0]?.status).toBe("ready");
  });

  it("marks an exact-timestamp duplicate against existing history", () => {
    const existing = emptyState();
    existing.movieWatchedAtByMovie.set(550, [new Date("2026-08-01T12:00:00Z")]);
    const plan = buildImportPlan(
      [{ record: movieWatch(new Date("2026-08-01T12:00:00Z")), resolved: RESOLVED_MOVIE }],
      existing,
    );
    expect(plan.entries[0]?.status).toBe("duplicate");
  });

  it("preserves real rewatches — two different dates both create events", () => {
    const plan = buildImportPlan(
      [
        { record: movieWatch(new Date("2026-08-01T12:00:00Z")), resolved: RESOLVED_MOVIE },
        { record: movieWatch(new Date("2026-08-05T12:00:00Z")), resolved: RESOLVED_MOVIE },
      ],
      emptyState(),
    );
    expect(plan.entries.map((e) => e.status)).toEqual(["ready", "ready"]);
    expect(plan.summary.ready).toBe(2);
  });

  it("catches the same file imported twice in one pass (duplicate rows within the batch itself)", () => {
    const record = movieWatch(new Date("2026-08-01T12:00:00Z"));
    const plan = buildImportPlan(
      [
        { record, resolved: RESOLVED_MOVIE },
        { record, resolved: RESOLVED_MOVIE },
      ],
      emptyState(),
    );
    expect(plan.entries.map((e) => e.status)).toEqual(["ready", "duplicate"]);
  });

  it("dateOnly precision compares by UTC calendar date, not exact instant", () => {
    const existing = emptyState();
    // A native event recorded at a specific time on Aug 1.
    existing.movieWatchedAtByMovie.set(550, [new Date("2026-08-01T23:00:00Z")]);
    const plan = buildImportPlan(
      [
        {
          record: movieWatch(new Date("2026-08-01T12:00:00Z"), "dateOnly"),
          resolved: RESOLVED_MOVIE,
        },
      ],
      existing,
    );
    expect(plan.entries[0]?.status).toBe("duplicate");
  });
});

describe("buildImportPlan — episode watch duplicate detection", () => {
  it("preserves distinct episodes and flags a true duplicate episode+date", () => {
    const existing = emptyState();
    existing.episodeWatchedAtByEpisode.set("1399:1:1", [new Date("2020-01-01T12:00:00Z")]);
    const plan = buildImportPlan(
      [
        { record: episodeWatch(1, 1, new Date("2020-01-01T12:00:00Z")), resolved: RESOLVED_SHOW },
        { record: episodeWatch(1, 2, new Date("2020-01-08T12:00:00Z")), resolved: RESOLVED_SHOW },
      ],
      existing,
    );
    expect(plan.entries[0]?.status).toBe("duplicate");
    expect(plan.entries[1]?.status).toBe("ready");
  });
});

describe("buildImportPlan — unresolved identities", () => {
  it("carries needsReview/notFound/lookupFailed straight through", () => {
    const records: ResolvedRecord[] = [
      { record: movieWatch(new Date()), resolved: { status: "needsReview", candidates: [] } },
      { record: movieWatch(new Date()), resolved: { status: "notFound" } },
      { record: movieWatch(new Date()), resolved: { status: "lookupFailed" } },
    ];
    const plan = buildImportPlan(records, emptyState());
    expect(plan.entries.map((e) => e.status)).toEqual(["needsReview", "notFound", "lookupFailed"]);
    expect(plan.summary.needsReview).toBe(1);
    expect(plan.summary.notFound).toBe(1);
    expect(plan.summary.lookupFailed).toBe(1);
  });
});

describe("buildImportPlan — merge rules", () => {
  it("Planning: existing Backlog is kept — an imported Watchlist entry is a conflict, never a downgrade", () => {
    const existing = emptyState();
    existing.planningIntentByMedia.set("movie:550", "backlog");
    const record: ParsedImportRecord = {
      kind: "planningItem",
      identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: 1999 },
      intent: "watchlist",
    };
    const plan = buildImportPlan([{ record, resolved: RESOLVED_MOVIE }], existing);
    expect(plan.entries[0]?.status).toBe("conflict");
  });

  it("Planning: an already-watched movie never gets a new planning entry", () => {
    const existing = emptyState();
    existing.movieWatchedAtByMovie.set(550, [new Date("2020-01-01T12:00:00Z")]);
    const record: ParsedImportRecord = {
      kind: "planningItem",
      identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: 1999 },
      intent: "watchlist",
    };
    const plan = buildImportPlan([{ record, resolved: RESOLVED_MOVIE }], existing);
    expect(plan.entries[0]?.status).toBe("conflict");
  });

  it("Comments: an existing comment always wins — never concatenated or overwritten", () => {
    const existing = emptyState();
    existing.hasCommentForMedia.add("movie:550");
    const record: ParsedImportRecord = {
      kind: "comment",
      identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: 1999 },
      content: "Imported comment",
    };
    const plan = buildImportPlan([{ record, resolved: RESOLVED_MOVIE }], existing);
    expect(plan.entries[0]?.status).toBe("conflict");
  });

  it("Comments: no existing comment creates one", () => {
    const record: ParsedImportRecord = {
      kind: "comment",
      identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: 1999 },
      content: "Imported comment",
    };
    const plan = buildImportPlan([{ record, resolved: RESOLVED_MOVIE }], emptyState());
    expect(plan.entries[0]?.status).toBe("ready");
  });

  it("Show tracking: existing explicit state is kept over an imported one", () => {
    const existing = emptyState();
    existing.trackingStatusByShow.set(1399, "dropped");
    const record: ParsedImportRecord = {
      kind: "showTrackingState",
      identity: { kind: "titleYear", mediaType: "show", title: "Winter's Watch", year: 2011 },
      status: "watching",
    };
    const plan = buildImportPlan([{ record, resolved: RESOLVED_SHOW }], existing);
    expect(plan.entries[0]?.status).toBe("conflict");
  });
});

describe("buildImportPlan — summary", () => {
  it("counts ready records per kind for the confirmation screen", () => {
    const plan = buildImportPlan(
      [
        { record: movieWatch(new Date("2026-08-01T12:00:00Z")), resolved: RESOLVED_MOVIE },
        {
          record: {
            kind: "comment",
            identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: 1999 },
            content: "Loved it",
          },
          resolved: RESOLVED_MOVIE,
        },
      ],
      emptyState(),
    );
    expect(plan.summary.readyByKind.movieWatch).toBe(1);
    expect(plan.summary.readyByKind.comment).toBe(1);
  });

  it("is deterministic — the same input always produces the same plan", () => {
    const records: ResolvedRecord[] = [
      { record: movieWatch(new Date("2026-08-01T12:00:00Z")), resolved: RESOLVED_MOVIE },
      { record: movieWatch(new Date("2026-08-05T12:00:00Z")), resolved: RESOLVED_MOVIE },
    ];
    const planA = buildImportPlan(records, emptyState());
    const planB = buildImportPlan(records, emptyState());
    expect(planA).toEqual(planB);
  });
});
