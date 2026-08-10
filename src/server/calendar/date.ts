// Pure date-only arithmetic — no I/O, no `Date`-instant comparisons for
// event dates themselves. See docs/calendar.md, "Date-only handling" and
// "Timezone" — this is the one place that reasoning lives; nothing else
// in Calendar re-derives it.
//
// Event dates (`YYYY-MM-DD`) are parsed directly into numeric parts and
// never round-tripped through `new Date(dateOnly)` + local getters — the
// exact bug this file exists to prevent, since a UTC midnight instant
// read back with local getters can silently land on the previous or
// next calendar day depending on the viewer's own timezone offset.
export type DateParts = { year: number; month: number; day: number };

export function parseDateOnly(dateOnly: string): DateParts {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 1, day: day ?? 1 };
}

// The one place a real `Date` instant is read for "what day is it right
// now" — `useLocalTimezone: false` (the browser's real local day is not
// yet known, e.g. before a client component mounts — same SSR-safe
// pattern `groupDiaryEntries` already uses) reads UTC getters instead, a
// value that's provably identical whether computed on the server or the
// client's very first render.
export function todayParts(now: Date, useLocalTimezone: boolean): DateParts {
  return useLocalTimezone
    ? { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
    : { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
}

// Signed day count from `from` to `to` — positive means `to` is later.
// Both sides must come from the same extraction basis (both real local,
// or both the UTC stand-in) to stay internally consistent, same
// requirement `groupDiaryEntries`'s `daysBetween` documents.
export function daysBetween(from: DateParts, to: DateParts): number {
  const toEpochDays = (parts: DateParts) =>
    Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
  return toEpochDays(to) - toEpochDays(from);
}

export function compareDateOnly(a: string, b: string): number {
  // ISO `YYYY-MM-DD` sorts correctly as a plain string — no parsing
  // needed for ordering, only for arithmetic (see `daysBetween`).
  return a < b ? -1 : a > b ? 1 : 0;
}

// Whether a date-only value has actually happened as of `asOf` — the
// same "aired regular episode" definition `server/tracking/progress.ts`
// and `features/media/has-released.ts` each already apply within their
// own layer (this domain can't import either directly: server code never
// depends on `features/`, and `progress.ts`'s own copy isn't exported —
// see docs/calendar.md, "Episode airing semantics"). A missing date is
// conservatively treated as not yet released, same as everywhere else.
export function hasAired(dateOnly: string | null, asOf: Date): boolean {
  if (!dateOnly) return false;
  const parts = parseDateOnly(dateOnly);
  return Date.UTC(parts.year, parts.month - 1, parts.day) <= asOf.getTime();
}

// "Today"/"Tomorrow" only once the real local timezone is actually known
// (see docs/calendar.md) — before that, every date gets a plain label
// instead of guessing, exactly like Diary's own date grouping.
export function formatReleaseDate(dateOnly: string, now: Date, useLocalTimezone: boolean): string {
  const parts = parseDateOnly(dateOnly);
  const today = todayParts(now, useLocalTimezone);

  if (useLocalTimezone) {
    const delta = daysBetween(today, parts);
    if (delta === 0) return "Today";
    if (delta === 1) return "Tomorrow";
    if (delta === -1) return "Yesterday";
  }

  const reference = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: parts.year === today.year ? undefined : "numeric",
    timeZone: "UTC",
  }).format(reference);
}
