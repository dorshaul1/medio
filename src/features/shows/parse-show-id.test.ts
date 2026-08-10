import { describe, expect, it } from "vitest";
import { parseShowId } from "./parse-show-id";

describe("parseShowId", () => {
  it("parses a well-formed numeric id", () => {
    expect(parseShowId("1399")).toBe(1399);
  });

  it("rejects non-numeric input", () => {
    expect(parseShowId("abc")).toBeNull();
  });

  it("rejects a negative number", () => {
    expect(parseShowId("-5")).toBeNull();
  });

  it("rejects zero", () => {
    expect(parseShowId("0")).toBeNull();
  });

  it("rejects a decimal", () => {
    expect(parseShowId("1399.5")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseShowId("")).toBeNull();
  });
});
