import { describe, expect, it } from "vitest";
import { formatRuntime } from "./format-runtime";

describe("formatRuntime", () => {
  it("formats hours and minutes", () => {
    expect(formatRuntime(148)).toBe("2h 28m");
  });

  it("formats an exact number of hours without a trailing 0m", () => {
    expect(formatRuntime(120)).toBe("2h");
  });

  it("formats under an hour as minutes only", () => {
    expect(formatRuntime(45)).toBe("45m");
  });
});
