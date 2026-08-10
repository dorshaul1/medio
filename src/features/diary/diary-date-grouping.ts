import type { DiaryEntry } from "@/server/diary/types";

export type DiaryDateGroup = {
  key: string;
  label: string;
  entries: readonly DiaryEntry[];
};

type DateParts = { year: number; month: number; day: number };

function localParts(date: Date): DateParts {
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
}

function utcParts(date: Date): DateParts {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

function partsKey(parts: DateParts): string {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Both sides are always extracted by the same getter family (see
// `groupDiaryEntries`), so this stays internally consistent regardless
// of which one — real local time, or the SSR-safe UTC stand-in — is
// currently in use.
function daysBetween(from: DateParts, to: DateParts): number {
  const toEpochDays = (parts: DateParts) =>
    Date.UTC(parts.year, parts.month, parts.day) / 86_400_000;
  return toEpochDays(to) - toEpochDays(from);
}

function formatGroupLabel(
  entryDate: Date,
  parts: DateParts,
  todayParts: DateParts,
  useLocalTimezone: boolean,
): string {
  // "Today"/"Yesterday" are only meaningful once the real local
  // timezone is known — see docs/diary.md, "Today/Yesterday". Before
  // that, every group gets a plain dated label instead of guessing.
  if (useLocalTimezone) {
    const delta = daysBetween(parts, todayParts);
    if (delta === 0) return "Today";
    if (delta === 1) return "Yesterday";
  }

  const sameYear = parts.year === todayParts.year;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: useLocalTimezone ? undefined : "UTC",
  }).format(entryDate);
}

// Groups already-hydrated, already-chronologically-sorted Diary entries
// by calendar day — a display concern, deliberately separate from
// `watchedAt`'s real stored instant (see docs/diary.md, "Timezone
// correctness"). `useLocalTimezone: false` groups by UTC calendar date
// instead of the browser's real local date — a value that's provably
// identical whether it's computed on the server or during the client's
// very first render, so `DiaryTimeline` uses it before mount specifically
// to avoid a hydration mismatch, then switches to `true` (the browser's
// real local day, the only *correct* basis for "did this land on
// today/yesterday") once mounted — see docs/diary.md, "Date grouping".
export function groupDiaryEntries(
  entries: readonly DiaryEntry[],
  now: Date,
  useLocalTimezone: boolean,
): readonly DiaryDateGroup[] {
  const extract = useLocalTimezone ? localParts : utcParts;
  const todayParts = extract(now);

  const groups: DiaryDateGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const entry of entries) {
    const parts = extract(entry.watchedAt);
    const key = partsKey(parts);
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      const group = groups[existingIndex];
      if (group) groups[existingIndex] = { ...group, entries: [...group.entries, entry] };
      continue;
    }
    indexByKey.set(key, groups.length);
    groups.push({
      key,
      label: formatGroupLabel(entry.watchedAt, parts, todayParts, useLocalTimezone),
      entries: [entry],
    });
  }

  return groups;
}
