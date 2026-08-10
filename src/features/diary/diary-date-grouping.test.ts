import { describe, expect, it } from "vitest";
import type { DiaryEntry, MovieDiaryEntry } from "@/server/diary/types";
import { groupDiaryEntries } from "./diary-date-grouping";

function movieEntry(id: string, watchedAt: Date, ordinal = 1): MovieDiaryEntry {
  return {
    kind: "movie",
    id,
    watchedAt,
    ordinal,
    movieProviderId: 550,
    title: "Fight Club",
    year: 1999,
    poster: null,
  };
}

// All fixtures below are constructed with `Date.UTC` explicitly and
// grouped with `useLocalTimezone: false` — both the entry dates and the
// "now" reference are read with the same UTC getters, so these
// assertions hold regardless of the host machine's actual local
// timezone (see the module comment for why the UTC path exists at all).
describe("groupDiaryEntries", () => {
  it("groups entries landing on the same UTC day into one group", () => {
    const now = new Date(Date.UTC(2024, 7, 10, 12, 0));
    const entries: DiaryEntry[] = [
      movieEntry("a", new Date(Date.UTC(2024, 7, 5, 9, 0))),
      movieEntry("b", new Date(Date.UTC(2024, 7, 5, 21, 0))),
    ];

    const groups = groupDiaryEntries(entries, now, false);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.entries).toHaveLength(2);
  });

  it("keeps consecutive-day entries in separate, correctly ordered groups", () => {
    const now = new Date(Date.UTC(2024, 7, 10, 12, 0));
    const entries: DiaryEntry[] = [
      movieEntry("a", new Date(Date.UTC(2024, 7, 5, 9, 0))),
      movieEntry("b", new Date(Date.UTC(2024, 7, 4, 9, 0))),
    ];

    const groups = groupDiaryEntries(entries, now, false);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.entries[0]?.id).toBe("a");
    expect(groups[1]?.entries[0]?.id).toBe("b");
  });

  it("labels the current UTC day as Today only when useLocalTimezone is true", () => {
    const now = new Date(Date.UTC(2024, 7, 10, 12, 0));
    const entries: DiaryEntry[] = [movieEntry("a", new Date(Date.UTC(2024, 7, 10, 1, 0)))];

    const utcGroups = groupDiaryEntries(entries, now, false);
    expect(utcGroups[0]?.label).not.toBe("Today");

    // useLocalTimezone reads with the *local* getters on both `now` and
    // the entry — constructing both via the local `Date` constructor
    // (not `Date.UTC`) keeps this assertion host-timezone-independent:
    // whatever timezone the test runs in, "the same local day" is true
    // for both by construction.
    const localNow = new Date(2024, 7, 10, 12, 0);
    const localEntries: DiaryEntry[] = [movieEntry("a", new Date(2024, 7, 10, 1, 0))];
    const localGroups = groupDiaryEntries(localEntries, localNow, true);
    expect(localGroups[0]?.label).toBe("Today");
  });

  it("labels the previous local day as Yesterday", () => {
    const now = new Date(2024, 7, 10, 12, 0);
    const entries: DiaryEntry[] = [movieEntry("a", new Date(2024, 7, 9, 20, 0))];

    const groups = groupDiaryEntries(entries, now, true);

    expect(groups[0]?.label).toBe("Yesterday");
  });

  it("omits the year for an older date within the current year", () => {
    const now = new Date(2024, 7, 10, 12, 0);
    const entries: DiaryEntry[] = [movieEntry("a", new Date(2024, 0, 3, 12, 0))];

    const groups = groupDiaryEntries(entries, now, true);

    expect(groups[0]?.label).toBe("January 3");
  });

  it("includes the year for a date from a previous year", () => {
    const now = new Date(2024, 7, 10, 12, 0);
    const entries: DiaryEntry[] = [movieEntry("a", new Date(2022, 0, 3, 12, 0))];

    const groups = groupDiaryEntries(entries, now, true);

    expect(groups[0]?.label).toBe("January 3, 2022");
  });

  it("never merges two different UTC days even a moment apart across midnight", () => {
    const now = new Date(Date.UTC(2024, 7, 10, 12, 0));
    const entries: DiaryEntry[] = [
      movieEntry("a", new Date(Date.UTC(2024, 7, 5, 23, 59, 59))),
      movieEntry("b", new Date(Date.UTC(2024, 7, 6, 0, 0, 1))),
    ];

    const groups = groupDiaryEntries(entries, now, false);

    expect(groups).toHaveLength(2);
  });
});
