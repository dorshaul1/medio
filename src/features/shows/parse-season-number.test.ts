import { describe, expect, it } from "vitest";
import { parseSeasonNumber } from "./parse-season-number";

describe("parseSeasonNumber", () => {
  it("parses a well-formed positive season number", () => {
    expect(parseSeasonNumber("2")).toBe(2);
  });

  it("accepts 0 — Specials is a valid season", () => {
    expect(parseSeasonNumber("0")).toBe(0);
  });

  it("rejects a negative number", () => {
    expect(parseSeasonNumber("-1")).toBeNull();
  });

  it("rejects a decimal", () => {
    expect(parseSeasonNumber("1.5")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseSeasonNumber("abc")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseSeasonNumber("")).toBeNull();
  });
});
