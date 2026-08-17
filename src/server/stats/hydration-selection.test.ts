import { describe, expect, it } from "vitest";
import { selectHydrationIds } from "./hydration-selection";

describe("selectHydrationIds", () => {
  it("always includes explicitly must-include titles (e.g. the most rewatched movie)", () => {
    const candidates = [
      { id: 1, lastActivityAt: new Date("2010-01-01") },
      { id: 2, lastActivityAt: new Date("2024-01-01") },
    ];
    const selected = selectHydrationIds({ candidates, mustIncludeIds: [1], limit: 1 });
    expect(selected).toContain(1);
  });

  it("fills remaining slots with the most recently active titles", () => {
    const candidates = [
      { id: 1, lastActivityAt: new Date("2020-01-01") },
      { id: 2, lastActivityAt: new Date("2024-01-01") },
      { id: 3, lastActivityAt: new Date("2022-01-01") },
    ];
    const selected = selectHydrationIds({ candidates, mustIncludeIds: [], limit: 2 });
    expect(new Set(selected)).toEqual(new Set([2, 3]));
  });

  it("never grows unbounded regardless of total history size", () => {
    const candidates = Array.from({ length: 1000 }, (_, index) => ({
      id: index,
      lastActivityAt: new Date(2000 + index, 0, 1),
    }));
    const selected = selectHydrationIds({ candidates, mustIncludeIds: [], limit: 150 });
    expect(selected.length).toBe(150);
  });
});
