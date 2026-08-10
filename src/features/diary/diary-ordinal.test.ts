import { describe, expect, it } from "vitest";
import { ordinalWatchLabel } from "./diary-ordinal";

describe("ordinalWatchLabel", () => {
  it.each([
    [2, "2nd watch"],
    [3, "3rd watch"],
    [4, "4th watch"],
    [11, "11th watch"],
    [12, "12th watch"],
    [13, "13th watch"],
    [21, "21st watch"],
    [22, "22nd watch"],
    [23, "23rd watch"],
    [101, "101st watch"],
    [111, "111th watch"],
  ])("labels ordinal %i as %s", (ordinal, expected) => {
    expect(ordinalWatchLabel(ordinal)).toBe(expected);
  });
});
