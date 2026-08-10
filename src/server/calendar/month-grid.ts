// Pure month-grid construction for the compact Calendar view — no I/O,
// no `Date`-instant arithmetic for the days themselves (see date.ts for
// why). Always Sunday-start: there is no "Week starts on" preference in
// this application (see docs/calendar.md, "No Week starts on setting"),
// so this uses the same fixed `en-US`-convention default the rest of
// this app's date formatting already assumes.
import { type DateParts, parseDateOnly } from "./date";

export type MonthDayCell = {
  // ISO `YYYY-MM-DD`.
  date: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateOnly(parts: DateParts): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

// Adds `days` (positive or negative) to a `DateParts` value via a UTC
// epoch round-trip — the same date-only-safe arithmetic basis `date.ts`
// uses elsewhere, never a local-timezone `Date` mutation.
function addDays(parts: DateParts, days: number): DateParts {
  const epochMs = Date.UTC(parts.year, parts.month - 1, parts.day) + days * 86_400_000;
  const result = new Date(epochMs);
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

// Every cell for one month's display grid, always complete weeks (padded
// with the trailing days of the previous month and the leading days of
// the next) — a real calendar page needs full weeks, not a ragged first/
// last row.
export function buildMonthGrid(
  year: number,
  month: number,
  todayDateOnly: string,
): readonly MonthDayCell[] {
  const firstOfMonth: DateParts = { year, month, day: 1 };
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const gridStart = addDays(firstOfMonth, -firstWeekday);

  const cells: MonthDayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const parts = addDays(gridStart, i);
    const date = toDateOnly(parts);
    cells.push({
      date,
      inCurrentMonth: parts.month === month,
      isToday: date === todayDateOnly,
    });
  }
  return cells;
}

export function formatMonthDateOnly(year: number, month: number, day: number): string {
  return toDateOnly({ year, month, day });
}

// A defensive re-export so callers building `todayDateOnly` don't need a
// second date-parsing import for the same shape this module already
// depends on.
export function parseMonthParam(raw: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const [, yearStr, monthStr] = match;
  const parts = parseDateOnly(`${yearStr}-${monthStr}-01`);
  if (parts.month < 1 || parts.month > 12) return null;
  return { year: parts.year, month: parts.month };
}
