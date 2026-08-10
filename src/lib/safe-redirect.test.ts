import { describe, expect, it } from "vitest";
import { isSafeReturnPath, safeReturnPath } from "./safe-redirect";

describe("isSafeReturnPath", () => {
  it("accepts a plain internal path", () => {
    expect(isSafeReturnPath("/library")).toBe(true);
    expect(isSafeReturnPath("/shows/1399/seasons/2")).toBe(true);
    expect(isSafeReturnPath("/discover?q=fight+club")).toBe(true);
  });

  it("rejects a protocol-relative external URL", () => {
    expect(isSafeReturnPath("//evil.com")).toBe(false);
  });

  it("rejects a backslash-prefixed value some browsers treat as protocol-relative", () => {
    expect(isSafeReturnPath("/\\evil.com")).toBe(false);
  });

  it("rejects a full external URL", () => {
    expect(isSafeReturnPath("https://evil.com")).toBe(false);
    expect(isSafeReturnPath("http://evil.com/library")).toBe(false);
  });

  it("rejects a non-path scheme", () => {
    expect(isSafeReturnPath("javascript:alert(1)")).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(isSafeReturnPath("")).toBe(false);
  });

  it("rejects looping back to an auth page", () => {
    expect(isSafeReturnPath("/sign-in")).toBe(false);
    expect(isSafeReturnPath("/sign-up")).toBe(false);
  });
});

describe("safeReturnPath", () => {
  it("returns the path when safe", () => {
    expect(safeReturnPath("/library")).toBe("/library");
  });

  it("falls back to '/' by default when missing", () => {
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
  });

  it("falls back to a custom default when unsafe", () => {
    expect(safeReturnPath("//evil.com", "/home")).toBe("/home");
  });
});
