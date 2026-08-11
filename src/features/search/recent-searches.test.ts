import { beforeEach, describe, expect, it } from "vitest";
import { addRecentSearch, clearRecentSearches, getRecentSearches } from "./recent-searches";

describe("recent searches", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty list when nothing has been searched yet", () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it("adds a search to the front of the list", () => {
    addRecentSearch("dune");
    addRecentSearch("the office");
    expect(getRecentSearches()).toEqual(["the office", "dune"]);
  });

  it("de-duplicates case-insensitively, re-promoting the existing entry", () => {
    addRecentSearch("Dune");
    addRecentSearch("the office");
    addRecentSearch("dune");
    expect(getRecentSearches()).toEqual(["dune", "the office"]);
  });

  it("caps the list at 5 entries", () => {
    for (const query of ["a", "b", "c", "d", "e", "f"]) {
      addRecentSearch(query);
    }
    expect(getRecentSearches()).toHaveLength(5);
    expect(getRecentSearches()).toEqual(["f", "e", "d", "c", "b"]);
  });

  it("ignores an empty/whitespace-only query", () => {
    addRecentSearch("   ");
    expect(getRecentSearches()).toEqual([]);
  });

  it("clears the whole list", () => {
    addRecentSearch("dune");
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });
});
