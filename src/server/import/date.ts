// Pure date parsing for imported watch timestamps — no I/O. See
// docs/data-portability.md, "Watch timestamps" and "Timezone".
export type ParsedImportDate = {
  date: Date;
  precision: "exact" | "dateOnly";
};

// A date-only source value (Letterboxd, generic CSV) is anchored at
// 12:00 UTC rather than midnight. This is a deliberate choice, not an
// arbitrary one: `MovieWatchEvent`/`EpisodeWatchEvent.watchedAt` is a
// real `timestamptz` instant, and Diary groups by the *browser's local*
// calendar day (see `groupDiaryEntries`). Midnight UTC shifts to the
// *previous* local day for every negative-UTC-offset timezone (exactly
// the classic bug CLAUDE.md warns against) — noon UTC keeps the intended
// calendar date stable for every offset from UTC-12 through UTC+11.
// Real-world offsets actually span UTC-12 through UTC+14 (26 hours), and
// no single anchor can cover a spread wider than 24 hours — so this is
// an honest, documented gap, not a silent one: a handful of the most
// extreme eastern offsets (UTC+12 through +14 — New Zealand, Fiji,
// Kiribati, Tonga) can read one calendar day later than intended. This
// is never presented as a real wall-clock time in the UI; date-only
// precision is preserved on the record and surfaced in
// the import preview.
export function parseDateOnly(dateOnly: string): ParsedImportDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly.trim());
  if (!match) return null;
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  // Reject a date that doesn't round-trip (e.g. "2026-02-30") rather than
  // silently normalizing to a nearby real date.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { date, precision: "dateOnly" };
}

// A real instant (native MEDIO export's own ISO timestamp) — exact
// precision preserved as-is, no anchoring needed.
export function parseExactTimestamp(iso: string): ParsedImportDate | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { date, precision: "exact" };
}

// Whether an imported watch date is the "same viewing" as an already-
// recorded one — see docs/data-portability.md, "Idempotency" and
// "Rewatch semantics". `exact` precision (a native re-import) compares
// the real instant; `dateOnly` precision (Letterboxd/generic CSV)
// compares only the UTC calendar date, since that's the precision the
// source actually gave. Two watches on genuinely different dates are
// never collapsed — this only ever suppresses a true duplicate.
//
// Known limitation: comparing by *UTC* calendar date against an
// existing event's own precise instant can occasionally miss a same-day
// match if that existing event was originally recorded near midnight in
// the user's own local timezone (its UTC date can differ from what the
// user saw locally) — see docs/data-portability.md, "Known limitations".
// This errs toward the safe direction: the failure mode is an extra
// watch event, never a silently suppressed real rewatch.
export function sameWatchDate(
  existing: Date,
  imported: Date,
  precision: "exact" | "dateOnly",
): boolean {
  if (precision === "exact") return existing.getTime() === imported.getTime();
  return (
    existing.getUTCFullYear() === imported.getUTCFullYear() &&
    existing.getUTCMonth() === imported.getUTCMonth() &&
    existing.getUTCDate() === imported.getUTCDate()
  );
}
