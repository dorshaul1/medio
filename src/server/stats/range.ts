// Pure date-range arithmetic for Stats — no I/O. Reuses Diary 2.0's own
// month-scoping conventions rather than inventing a second timezone
// interpretation (see docs/diary.md, "Month navigation and timezone" and
// docs/stats.md, "Date ranges"): every period boundary is a half-open
// `[start, end)` UTC range. The server can't know the viewer's real
// local timezone, so a period edge can be off by at most a few hours —
// the same accepted, documented tradeoff `server/diary/events.ts`'s
// `period` filter and `computeMonthlyActivity` already make.
import { addMonths, formatMonthParam, parseMonthParam } from "@/lib/month";

export type StatsRange =
  | { kind: "all" }
  | { kind: "year"; year: number }
  | { kind: "last12months" }
  | { kind: "month"; year: number; month: number };

// `null` means unbounded (all time) — every SQL aggregate in this domain
// treats a `null` bounds the same way `server/diary/events.ts` treats a
// `null` period: no range filter applied at all.
export type StatsRangeBounds = { start: Date; end: Date } | null;

export function resolveStatsRangeBounds(range: StatsRange, now: Date): StatsRangeBounds {
  switch (range.kind) {
    case "all":
      return null;
    case "year":
      return {
        start: new Date(Date.UTC(range.year, 0, 1)),
        end: new Date(Date.UTC(range.year + 1, 0, 1)),
      };
    case "month":
      return {
        start: new Date(Date.UTC(range.year, range.month - 1, 1)),
        end: new Date(Date.UTC(range.year, range.month, 1)),
      };
    case "last12months": {
      // Trailing 12 calendar months ending *now* (a real instant, not
      // rounded to a month boundary) — the same window
      // `computeMonthlyActivity`'s own 12-bucket chart already covers,
      // expressed here as one concrete range instead of 12 buckets.
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
      return { start, end: now };
    }
  }
}

// The immediately-preceding equivalent period, for Compare (see
// docs/stats.md, "Comparison") — `null` for "all" (there's no meaningful
// "previous all-time") and for a "month"/"year" range whose previous
// period is expressed by month/year arithmetic. Deliberately never a
// ms-duration shift of the current range's own bounds — a calendar
// year's real length varies with leap years, so that would occasionally
// misalign a "previous year" by a day; real calendar arithmetic avoids
// that entirely.
export function resolvePreviousStatsRangeBounds(range: StatsRange, now: Date): StatsRangeBounds {
  switch (range.kind) {
    case "all":
      return null;
    case "year":
      return resolveStatsRangeBounds({ kind: "year", year: range.year - 1 }, now);
    case "month": {
      const previous = addMonths({ year: range.year, month: range.month }, -1);
      return resolveStatsRangeBounds({ kind: "month", ...previous }, now);
    }
    case "last12months": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
      return { start, end };
    }
  }
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatStatsRangeLabel(range: StatsRange): string {
  switch (range.kind) {
    case "all":
      return "All time";
    case "year":
      return String(range.year);
    case "last12months":
      return "Last 12 months";
    case "month":
      return MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(range.year, range.month - 1, 1)));
  }
}

// `?range=` URL round-tripping — `all` | `last12months` | `YYYY` |
// `YYYY-MM`, the same compact vocabulary the range control renders as
// chips. An invalid/missing value always falls back to `"all"`, the same
// convention every other `normalize*` URL param parser in this app uses.
export function parseStatsRangeParam(raw: string | string[] | undefined): StatsRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return { kind: "all" };
  if (value === "all") return { kind: "all" };
  if (value === "last12months") return { kind: "last12months" };

  const month = parseMonthParam(value);
  if (month) return { kind: "month", year: month.year, month: month.month };

  if (/^\d{4}$/.test(value)) return { kind: "year", year: Number(value) };

  return { kind: "all" };
}

export function formatStatsRangeParam(range: StatsRange): string {
  switch (range.kind) {
    case "all":
      return "all";
    case "last12months":
      return "last12months";
    case "year":
      return String(range.year);
    case "month":
      return formatMonthParam({ year: range.year, month: range.month });
  }
}

// A range genuinely has a comparable previous period — "all" doesn't.
export function statsRangeSupportsComparison(range: StatsRange): boolean {
  return range.kind !== "all";
}
