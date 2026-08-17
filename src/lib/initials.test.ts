import { describe, expect, it } from "vitest";
import { getInitials } from "./initials";

describe("getInitials", () => {
  it("uses first + last initial for a normal name", () => {
    expect(getInitials("Dor Shaul")).toBe("DS");
  });

  it("handles a middle name — still first + last word", () => {
    expect(getInitials("Ada Augusta Lovelace")).toBe("AL");
  });

  it("uses the first two letters of a single-word name", () => {
    expect(getInitials("Madonna")).toBe("MA");
  });

  it("falls back to '?' for an empty name", () => {
    expect(getInitials("")).toBe("?");
  });

  it("falls back to '?' for a whitespace-only name", () => {
    expect(getInitials("   ")).toBe("?");
  });

  it("collapses extra internal whitespace", () => {
    expect(getInitials("Dor   Shaul")).toBe("DS");
  });

  it("handles a very long name without throwing", () => {
    const longName = "Dor Alexander Benjamin Christopher David Shaul";
    expect(getInitials(longName)).toBe("DS");
  });

  it("always uppercases the result", () => {
    expect(getInitials("dor shaul")).toBe("DS");
  });
});
