// Generic `YYYY-MM` month-parameter arithmetic — no domain semantics, no
// I/O. Originally lived only in `server/calendar/month-grid.ts`; extracted
// here once Diary's own month navigation needed the identical parsing and
// add/subtract logic (see docs/diary.md, "Month navigation and
// timezone") — a genuine second use case, not a speculative abstraction.
// Both `year`/`month` are plain calendar numbers (`month` is 1-12); this
// file never touches a real `Date` instant or a specific timezone
// interpretation — that's each caller's own concern (see
// `server/calendar/date.ts` and `server/diary/events.ts`).
export type MonthPeriod = { year: number; month: number };

// Parses a `?month=YYYY-MM` URL param. Returns `null` for anything
// malformed rather than throwing — callers fall back to a sensible
// default, the same convention every other `normalize*` URL param parser
// in this app uses.
export function parseMonthParam(raw: string): MonthPeriod | null {
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function formatMonthParam(period: MonthPeriod): string {
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

// Adds `delta` months (positive or negative) to a period, rolling the
// year over as needed.
export function addMonths(period: MonthPeriod, delta: number): MonthPeriod {
  const zeroBased = period.year * 12 + (period.month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (((zeroBased % 12) + 12) % 12) + 1 };
}
