import { describe, expect, it } from "vitest";
import {
  isRawStateValidForMediaType,
  normalizeLibraryCount,
  normalizeLibraryMediaType,
  normalizeLibrarySort,
  normalizeLibraryState,
} from "./library-params";

describe("normalizeLibraryMediaType", () => {
  it("accepts movie/show", () => {
    expect(normalizeLibraryMediaType("movie")).toBe("movie");
    expect(normalizeLibraryMediaType("show")).toBe("show");
  });

  it("falls back to undefined (All) for anything else", () => {
    expect(normalizeLibraryMediaType("bogus")).toBeUndefined();
    expect(normalizeLibraryMediaType(undefined)).toBeUndefined();
  });
});

describe("normalizeLibraryState", () => {
  it("accepts a known raw state", () => {
    expect(normalizeLibraryState("watching")).toBe("watching");
  });

  it("falls back to undefined for an unknown value", () => {
    expect(normalizeLibraryState("caught_up")).toBeUndefined();
    expect(normalizeLibraryState(undefined)).toBeUndefined();
  });
});

describe("isRawStateValidForMediaType", () => {
  it("Watchlist and Backlog apply to both media types", () => {
    expect(isRawStateValidForMediaType("watchlist", "movie")).toBe(true);
    expect(isRawStateValidForMediaType("watchlist", "show")).toBe(true);
    expect(isRawStateValidForMediaType("backlog", "movie")).toBe(true);
    expect(isRawStateValidForMediaType("backlog", "show")).toBe(true);
  });

  it("Watched is movie-only", () => {
    expect(isRawStateValidForMediaType("watched", "movie")).toBe(true);
    expect(isRawStateValidForMediaType("watched", "show")).toBe(false);
  });

  it("Watching/On hold/Dropped are show-only", () => {
    for (const state of ["watching", "on_hold", "dropped"] as const) {
      expect(isRawStateValidForMediaType(state, "show")).toBe(true);
      expect(isRawStateValidForMediaType(state, "movie")).toBe(false);
    }
  });
});

describe("normalizeLibrarySort", () => {
  it("maps 'added' to recently_added", () => {
    expect(normalizeLibrarySort("added")).toBe("recently_added");
  });

  it("defaults to recently_active for anything else", () => {
    expect(normalizeLibrarySort("bogus")).toBe("recently_active");
    expect(normalizeLibrarySort(undefined)).toBe("recently_active");
  });
});

describe("normalizeLibraryCount", () => {
  it("defaults to the page size", () => {
    expect(normalizeLibraryCount(undefined)).toBe(24);
  });

  it("accepts a larger, valid count", () => {
    expect(normalizeLibraryCount("48")).toBe(48);
  });

  it("rejects a count below the page size", () => {
    expect(normalizeLibraryCount("1")).toBe(24);
  });

  it("clamps an absurdly large count", () => {
    expect(normalizeLibraryCount("999999")).toBeLessThanOrEqual(24 * 20);
  });

  it("rejects a non-numeric value", () => {
    expect(normalizeLibraryCount("not-a-number")).toBe(24);
  });
});
