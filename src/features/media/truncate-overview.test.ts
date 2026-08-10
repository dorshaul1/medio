import { describe, expect, it } from "vitest";
import { truncateOverview } from "./truncate-overview";

describe("truncateOverview", () => {
  it("returns short text unchanged", () => {
    expect(truncateOverview("A short overview.")).toBe("A short overview.");
  });

  it("truncates long text at a word boundary and appends an ellipsis", () => {
    const overview =
      "A thief who steals corporate secrets through use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.";
    const result = truncateOverview(overview, 50);

    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toMatch(/\s…$/);
  });

  it("respects the exact boundary — text at maxLength is left untouched", () => {
    const overview = "x".repeat(160);
    expect(truncateOverview(overview)).toBe(overview);
  });
});
