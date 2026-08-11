import "server-only";
import { requireSession } from "@/server/auth/session";
import { DIARY_PAGE_SIZE } from "./constants";
import {
  getDiaryActivityCalendar as getDiaryActivityCalendarForUser,
  listDiaryEvents,
} from "./events";
import { hydrateDiaryEvents } from "./hydrate";
import type {
  DiaryCursor,
  DiaryFilter,
  DiaryMonthActivity,
  DiaryPage,
  DiaryPeriod,
  DiarySort,
} from "./types";

// The Diary's one reusable read — a page of the current user's unified
// viewing history, hydrated with provider metadata. Owns the session
// boundary (`requireSession()`), same layering as
// `server/library/queries.ts`'s `getLibraryPage`: `events.ts` is a
// lower-level, explicitly-`userId`-scoped query (the same split as
// `server/library/candidates.ts`), never session-aware itself.
//
// `period` scopes the query to one real calendar month (Diary 2.0's
// default browsing mode — see docs/diary.md, "Month-scoped querying");
// omitted, it queries the entire history unbounded — used only by
// `loadMoreDiaryEntriesAction` when "Load more" is paging within an
// already-scoped month (the cursor already carries forward the
// boundary's effect, but passing `period` again keeps the query itself
// bounded rather than relying on the cursor alone).
export async function getDiaryPage(input: {
  filter: DiaryFilter;
  sort: DiarySort;
  cursor: DiaryCursor | null;
  period?: DiaryPeriod | null;
  limit?: number;
}): Promise<DiaryPage> {
  const { user } = await requireSession();
  const limit = input.limit ?? DIARY_PAGE_SIZE;

  const { events, hasMore } = await listDiaryEvents({
    userId: user.id,
    filter: input.filter,
    sort: input.sort,
    cursor: input.cursor,
    period: input.period ?? null,
    limit,
  });

  const entries = await hydrateDiaryEvents(events);

  const lastEvent = events[events.length - 1];
  const nextCursor: DiaryCursor | null =
    hasMore && lastEvent
      ? { watchedAt: lastEvent.watchedAt, eventType: lastEvent.eventType, id: lastEvent.id }
      : null;

  return { entries, nextCursor, hasMore };
}

// The current user's real month-by-month activity — see
// `getDiaryActivityCalendar` (`events.ts`) for the query itself. Powers
// the month/year picker and the monthly overview line; never used to
// render actual entries.
export async function getDiaryActivityCalendar(): Promise<readonly DiaryMonthActivity[]> {
  const { user } = await requireSession();
  return getDiaryActivityCalendarForUser(user.id);
}
