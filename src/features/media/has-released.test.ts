import { describe, expect, it } from "vitest";
import { hasReleased } from "./has-released";

const ASOF = new Date("2024-06-01T00:00:00Z");

describe("hasReleased", () => {
  it("is true for a past date", () => {
    expect(hasReleased("2020-01-01", ASOF)).toBe(true);
  });

  it("is true for today", () => {
    expect(hasReleased("2024-06-01", ASOF)).toBe(true);
  });

  it("is false for a future date", () => {
    expect(hasReleased("2099-01-01", ASOF)).toBe(false);
  });

  it("is false — not true by default — when there's no date on file", () => {
    expect(hasReleased(null, ASOF)).toBe(false);
  });

  it("doesn't shift a day depending on timezone parsing", () => {
    // A UTC-parsed date-only string must not roll over to the previous
    // day just because `asOf` is a specific instant later that same day.
    expect(hasReleased("2024-06-01", new Date("2024-06-01T23:59:59Z"))).toBe(true);
  });
});
