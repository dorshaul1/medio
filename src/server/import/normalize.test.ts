import { describe, expect, it } from "vitest";
import { normalizeTitle, titlesMatch } from "./normalize";

describe("normalizeTitle", () => {
  it("lowercases and collapses punctuation to spaces", () => {
    expect(normalizeTitle("The Office (US)")).toBe("the office us");
  });

  it("strips accents", () => {
    expect(normalizeTitle("Léon: The Professional")).toBe("leon the professional");
  });

  it("collapses repeated whitespace/punctuation", () => {
    expect(normalizeTitle("Spider-Man:  Homecoming")).toBe("spider man homecoming");
  });
});

describe("titlesMatch", () => {
  it("matches titles differing only by case/punctuation", () => {
    expect(titlesMatch("The Office (US)", "the office us")).toBe(true);
  });

  it("does not match genuinely different titles", () => {
    expect(titlesMatch("The Office (US)", "The Office (UK)")).toBe(false);
  });
});
