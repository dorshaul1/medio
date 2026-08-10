import { describe, expect, it } from "vitest";
import { extractSearchQueryParam, normalizeSearchQuery } from "./normalize-search-query";

describe("extractSearchQueryParam", () => {
  it("passes through a plain string", () => {
    expect(extractSearchQueryParam("severance")).toBe("severance");
  });

  it("takes the first value of a repeated ?q= param", () => {
    expect(extractSearchQueryParam(["severance", "other"])).toBe("severance");
  });

  it("returns an empty string when the param is absent", () => {
    expect(extractSearchQueryParam(undefined)).toBe("");
  });
});

describe("normalizeSearchQuery", () => {
  it("returns the trimmed query when it meets the minimum length", () => {
    expect(normalizeSearchQuery("  severance  ")).toBe("severance");
  });

  it("returns null for a missing query", () => {
    expect(normalizeSearchQuery(undefined)).toBeNull();
  });

  it("returns null for an empty or whitespace-only query", () => {
    expect(normalizeSearchQuery("")).toBeNull();
    expect(normalizeSearchQuery("   ")).toBeNull();
  });

  it("returns null for a single character — below the noise threshold", () => {
    expect(normalizeSearchQuery("s")).toBeNull();
  });

  it("accepts exactly the minimum length", () => {
    expect(normalizeSearchQuery("se")).toBe("se");
  });
});
