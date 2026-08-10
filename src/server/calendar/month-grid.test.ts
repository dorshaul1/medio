import { describe, expect, it } from "vitest";
import { buildMonthGrid, formatMonthDateOnly, parseMonthParam } from "./month-grid";

describe("buildMonthGrid", () => {
  it("always returns 42 cells (6 complete weeks)", () => {
    expect(buildMonthGrid(2026, 8, "2026-08-17")).toHaveLength(42);
  });

  it("starts the grid on a Sunday", () => {
    const grid = buildMonthGrid(2026, 8, "2026-08-17");
    const firstCellWeekday = new Date(`${grid[0]?.date}T00:00:00Z`).getUTCDay();
    expect(firstCellWeekday).toBe(0);
  });

  it("includes every day of the month, all marked inCurrentMonth", () => {
    const grid = buildMonthGrid(2026, 8, "2026-08-17");
    const augustCells = grid.filter((cell) => cell.inCurrentMonth);
    expect(augustCells).toHaveLength(31); // August has 31 days
    expect(augustCells[0]?.date).toBe("2026-08-01");
    expect(augustCells.at(-1)?.date).toBe("2026-08-31");
  });

  it("pads leading/trailing days from adjacent months as not inCurrentMonth", () => {
    const grid = buildMonthGrid(2026, 8, "2026-08-17");
    const padding = grid.filter((cell) => !cell.inCurrentMonth);
    expect(padding.length).toBeGreaterThan(0);
    for (const cell of padding) {
      expect(cell.date.startsWith("2026-08")).toBe(false);
    }
  });

  it("marks exactly the matching cell isToday", () => {
    const grid = buildMonthGrid(2026, 8, "2026-08-17");
    const todayCells = grid.filter((cell) => cell.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0]?.date).toBe("2026-08-17");
  });

  it("correctly crosses a year boundary (December)", () => {
    const grid = buildMonthGrid(2026, 12, "2026-12-01");
    const decemberCells = grid.filter((cell) => cell.inCurrentMonth);
    expect(decemberCells).toHaveLength(31);
    expect(decemberCells[0]?.date).toBe("2026-12-01");
  });

  it("correctly handles February in a non-leap year", () => {
    const grid = buildMonthGrid(2026, 2, "2026-02-01");
    expect(grid.filter((cell) => cell.inCurrentMonth)).toHaveLength(28);
  });
});

describe("formatMonthDateOnly", () => {
  it("zero-pads month and day", () => {
    expect(formatMonthDateOnly(2026, 8, 5)).toBe("2026-08-05");
  });
});

describe("parseMonthParam", () => {
  it("parses a valid YYYY-MM string", () => {
    expect(parseMonthParam("2026-08")).toEqual({ year: 2026, month: 8 });
  });

  it("returns null for a malformed value", () => {
    expect(parseMonthParam("bogus")).toBeNull();
    expect(parseMonthParam("2026-13")).toBeNull();
    expect(parseMonthParam("2026")).toBeNull();
  });
});
