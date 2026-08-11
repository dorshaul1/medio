"use server";

import { getDiaryPage } from "@/server/diary/queries";
import type {
  DiaryCursor,
  DiaryFilter,
  DiaryPage,
  DiaryPeriod,
  DiarySort,
} from "@/server/diary/types";

// Diary's "Load more" — a read, not a mutation, so unlike every other
// action in this directory it needs no `revalidatePath`. `getDiaryPage`
// already derives the acting user from the session itself and never
// trusts a caller-supplied user id (see docs/diary.md, "Privacy"), so
// this stays a thin Server Action boundary: it exists only so
// `DiaryTimeline` (a Client Component — see docs/diary.md, "Pagination
// architecture") can fetch and hydrate the next page server-side without
// the Diary becoming a client-fetching application. Edit/delete actions
// for a specific viewing live beside the tracking domain functions they
// wrap (`features/movies/movie-tracking-actions.ts`,
// `features/shows/show-tracking-actions.ts`) — never duplicated here —
// so there is exactly one mutation path per event type.
export async function loadMoreDiaryEntriesAction(input: {
  filter: DiaryFilter;
  sort: DiarySort;
  cursor: DiaryCursor;
  period: DiaryPeriod;
}): Promise<DiaryPage> {
  return getDiaryPage({
    filter: input.filter,
    sort: input.sort,
    cursor: input.cursor,
    period: input.period,
  });
}
