import { describe, expect, it } from "vitest";
import {
  normalizeDiscoverMediaType,
  normalizeDiscoverPage,
  normalizeDiscoverSort,
  normalizeSearchResultType,
} from "./discover-params";

describe("normalizeDiscoverMediaType", () => {
  it("accepts 'movies' and 'shows'", () => {
    expect(normalizeDiscoverMediaType("movies")).toBe("movies");
    expect(normalizeDiscoverMediaType("shows")).toBe("shows");
  });

  it("defaults to 'movies' for anything else, including absence", () => {
    expect(normalizeDiscoverMediaType(undefined)).toBe("movies");
    expect(normalizeDiscoverMediaType("nonsense")).toBe("movies");
  });

  it("takes the first value of a repeated param", () => {
    expect(normalizeDiscoverMediaType(["shows", "movies"])).toBe("shows");
  });

  it("uses the given fallback (Default Discover view preference) when `?type=` is absent", () => {
    expect(normalizeDiscoverMediaType(undefined, "shows")).toBe("shows");
  });

  it("an explicit `?type=` still wins over the fallback", () => {
    expect(normalizeDiscoverMediaType("movies", "shows")).toBe("movies");
  });
});

describe("normalizeDiscoverSort", () => {
  it("accepts the three real sort values", () => {
    expect(normalizeDiscoverSort("popular")).toBe("popular");
    expect(normalizeDiscoverSort("top_rated")).toBe("top_rated");
    expect(normalizeDiscoverSort("newest")).toBe("newest");
  });

  it("falls back to 'popular' for a missing or invalid value, rather than rejecting", () => {
    expect(normalizeDiscoverSort(undefined)).toBe("popular");
    expect(normalizeDiscoverSort("vote_average.desc")).toBe("popular");
  });
});

describe("normalizeDiscoverPage", () => {
  it("parses a valid page number", () => {
    expect(normalizeDiscoverPage("3")).toBe(3);
  });

  it("defaults to 1 for a missing, non-numeric, zero, or negative value", () => {
    expect(normalizeDiscoverPage(undefined)).toBe(1);
    expect(normalizeDiscoverPage("abc")).toBe(1);
    expect(normalizeDiscoverPage("0")).toBe(1);
    expect(normalizeDiscoverPage("-2")).toBe(1);
  });
});

describe("normalizeSearchResultType", () => {
  it("accepts the four real filter values", () => {
    expect(normalizeSearchResultType("all")).toBe("all");
    expect(normalizeSearchResultType("movies")).toBe("movies");
    expect(normalizeSearchResultType("shows")).toBe("shows");
    expect(normalizeSearchResultType("people")).toBe("people");
  });

  it("defaults to 'all' — never something the user must opt into", () => {
    expect(normalizeSearchResultType(undefined)).toBe("all");
    expect(normalizeSearchResultType("nonsense")).toBe("all");
  });
});
