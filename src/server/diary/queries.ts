import "server-only";
import { requireSession } from "@/server/auth/session";
import { DIARY_PAGE_SIZE } from "./constants";
import { listDiaryEvents } from "./events";
import { hydrateDiaryEvents } from "./hydrate";
import type { DiaryCursor, DiaryFilter, DiaryPage, DiarySort } from "./types";

// The Diary's one reusable read — a page of the current user's unified
// viewing history, hydrated with provider metadata. Owns the session
// boundary (`requireSession()`), same layering as
// `server/library/queries.ts`'s `getLibraryPage`: `events.ts` is a
// lower-level, explicitly-`userId`-scoped query (the same split as
// `server/library/candidates.ts`), never session-aware itself.
export async function getDiaryPage(input: {
  filter: DiaryFilter;
  sort: DiarySort;
  cursor: DiaryCursor | null;
  limit?: number;
}): Promise<DiaryPage> {
  const { user } = await requireSession();
  const limit = input.limit ?? DIARY_PAGE_SIZE;

  const { events, hasMore } = await listDiaryEvents({
    userId: user.id,
    filter: input.filter,
    sort: input.sort,
    cursor: input.cursor,
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
