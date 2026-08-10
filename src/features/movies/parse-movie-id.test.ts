import { describe, expect, it } from "vitest";
import { parseMovieId } from "./parse-movie-id";

describe("parseMovieId", () => {
  it("parses a well-formed numeric id", () => {
    expect(parseMovieId("27205")).toBe(27205);
  });

  it("rejects non-numeric input", () => {
    expect(parseMovieId("abc")).toBeNull();
  });

  it("rejects a negative number", () => {
    expect(parseMovieId("-5")).toBeNull();
  });

  it("rejects zero", () => {
    expect(parseMovieId("0")).toBeNull();
  });

  it("rejects a decimal", () => {
    expect(parseMovieId("27205.5")).toBeNull();
  });

  it("rejects a leading-plus or whitespace-padded value Number() would otherwise accept", () => {
    expect(parseMovieId("+27205")).toBeNull();
    expect(parseMovieId(" 27205")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseMovieId("")).toBeNull();
  });
});
