import { DIARY_SESSION_MAX_GAP_MINUTES } from "@/server/diary/constants";
import type { DiaryEntry, EpisodeDiaryEntry } from "@/server/diary/types";

// Presentation-only viewing-session grouping — see docs/diary.md,
// "Viewing session grouping". Never changes what's stored, never
// reorders/drops/merges the underlying events: a session is just an
// alternate *rendering* of two or more already-real `EpisodeDiaryEntry`
// rows, and expanding one reveals the exact same rows a non-grouped day
// would show. Movies and `UnavailableDiaryEntry` rows never participate
// — they always render as their own single row.
export type DiaryRowGroup =
  | { kind: "single"; entry: DiaryEntry }
  | {
      kind: "session";
      key: string;
      showProviderId: number;
      // Chronological (oldest-first) regardless of the page's own sort —
      // a binge session reads as a narrative ("watched E4, then E5, then
      // E6"), independent of whether the surrounding day list is
      // newest-first or oldest-first.
      entries: readonly EpisodeDiaryEntry[];
    };

function isGroupableEpisode(entry: DiaryEntry): entry is EpisodeDiaryEntry {
  return entry.kind === "episode";
}

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60_000;
}

// Groups one already-hydrated list of same-day Diary entries (in the
// day's own display order — newest-first or oldest-first, either is
// fine, see below) into single rows and binge sessions. Two consecutive
// entries (adjacent in the *given* order — never reordered first) join
// the same session when both are Episode entries of the *same show* and
// no more than `DIARY_SESSION_MAX_GAP_MINUTES` apart. A session of size
// one collapses back to a plain single row — grouping only matters once
// there are genuinely multiple episodes to compress. Deliberately
// conservative: a movie, an unavailable entry, a different show, or too
// large a gap all end the current session immediately, never guessed
// past.
export function groupDiarySessions(entries: readonly DiaryEntry[]): readonly DiaryRowGroup[] {
  const groups: DiaryRowGroup[] = [];
  let current: EpisodeDiaryEntry[] = [];

  function flush() {
    if (current.length === 0) return;
    if (current.length === 1) {
      const [only] = current;
      if (only) groups.push({ kind: "single", entry: only });
    } else {
      const sorted = [...current].sort((a, b) => a.watchedAt.getTime() - b.watchedAt.getTime());
      groups.push({
        kind: "session",
        // Stable regardless of grouping order — the session's own oldest
        // event id is a real, unique anchor (two sessions can never share
        // one), unlike a synthetic index-based key.
        key: `session:${sorted[0]?.id}`,
        showProviderId: current[0]?.showProviderId ?? 0,
        entries: sorted,
      });
    }
    current = [];
  }

  for (const entry of entries) {
    if (!isGroupableEpisode(entry)) {
      flush();
      groups.push({ kind: "single", entry });
      continue;
    }

    const previous = current[current.length - 1];
    const joinsCurrent =
      previous !== undefined &&
      previous.showProviderId === entry.showProviderId &&
      minutesBetween(previous.watchedAt, entry.watchedAt) <= DIARY_SESSION_MAX_GAP_MINUTES;

    if (previous !== undefined && !joinsCurrent) flush();
    current.push(entry);
  }
  flush();

  return groups;
}

// A session's compact episode-coordinate label — "S2 E4-E6" when every
// episode shares one season and forms a contiguous ascending run, or
// "S2 E4, E6, E9" for a same-season non-contiguous run (a real, if less
// tidy, binge). Returns `null` once a session spans more than one season
// — no compact coordinate reads well there, so the caller falls back to
// a plain episode count instead (see `DiaryEpisodeSession`). See
// docs/diary.md, "Viewing session grouping" for why this stays
// conservative rather than guessing at a range that isn't really there.
export function sessionEpisodeLabel(entries: readonly EpisodeDiaryEntry[]): string | null {
  const seasons = new Set(entries.map((entry) => entry.seasonNumber));
  if (seasons.size > 1) return null;

  const season = entries[0]?.seasonNumber;
  const numbers = entries.map((entry) => entry.episodeNumber);
  const isContiguousAscending = numbers.every(
    (number, index) => index === 0 || number === (numbers[index - 1] ?? 0) + 1,
  );

  if (isContiguousAscending) {
    const first = numbers[0];
    const last = numbers[numbers.length - 1];
    return `S${season} E${first}-E${last}`;
  }

  return `S${season} ${numbers.map((number) => `E${number}`).join(", ")}`;
}
