"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type {
  DiaryCursor,
  DiaryEntry,
  DiaryFilter,
  DiaryPeriod,
  DiarySort,
} from "@/server/diary/types";
import { loadMoreDiaryEntriesAction } from "./diary-actions";
import { groupDiaryEntries } from "./diary-date-grouping";
import { DiaryEntryRow } from "./diary-entry-row";
import { DiaryEpisodeSession } from "./diary-episode-session";
import { groupDiarySessions } from "./diary-session-grouping";

// Diary's client-side timeline layer — deliberately narrow: local-
// timezone date grouping (see docs/diary.md, "Date grouping"),
// presentation-only session grouping (`groupDiarySessions`), and "Load
// more" pagination *within* the current month are the only things that
// genuinely need the browser here. Data fetching/hydration/authorization
// stay entirely server-side (`server/diary/queries.ts`, called from the
// page and from `loadMoreDiaryEntriesAction`) — this component only ever
// receives an already-hydrated, already-month-scoped page of
// `DiaryEntry`s, never queries anything itself.
//
// The page keys this component by `${filter}:${sort}` (see
// `app/(app)/library/diary/page.tsx`) — the same "remount on identity
// change" idiom `LibraryItemRow`/`UpNextCard` already use — so switching
// filters or sort order always starts a fresh timeline seeded from the
// server's own first page, rather than this component's internal
// "loaded so far" state leaking across an unrelated filter change.
export function DiaryTimeline({
  initialEntries,
  initialCursor,
  initialHasMore,
  filter,
  sort,
  period,
}: {
  initialEntries: readonly DiaryEntry[];
  initialCursor: DiaryCursor | null;
  initialHasMore: boolean;
  filter: DiaryFilter;
  sort: DiarySort;
  // The one month this page is scoped to — forwarded to "Load more" so a
  // very active month's later pages stay bounded to it too (see
  // docs/diary.md, "Month-scoped querying"), never silently falling back
  // to paging across the user's entire history.
  period: DiaryPeriod;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState("");

  // An Edit/Delete action (`DiaryEntryMenu`) revalidates this route via
  // `revalidatePath("/library/diary")` — Next.js re-renders this page's
  // Server Component and passes this component fresh `initial*` props,
  // but a Client Component's own `useState` only consults its
  // *initializer* on mount; it would otherwise keep showing this
  // component's own stale "loaded so far" state forever. Resyncing here
  // whenever the server's own first page actually changes is what makes
  // an edited date/deleted entry actually appear — the tradeoff is that
  // any such revalidation also collapses previously-loaded "Load more"
  // pages back to the server's fresh first page, which is correct
  // (never stale/duplicate data) even if it loses scroll depth.
  useEffect(() => {
    setEntries(initialEntries);
    setCursor(initialCursor);
    setHasMore(initialHasMore);
  }, [initialEntries, initialCursor, initialHasMore]);

  // `mounted` starts `false` identically on the server render and the
  // client's very first render, so there is nothing to reconcile at
  // hydration time — it only flips (via this effect, which never runs
  // during SSR) once the component is genuinely running in the user's
  // browser and `groupDiaryEntries` can safely switch from the SSR-safe
  // UTC grouping to the browser's real local-timezone grouping (see
  // `diary-date-grouping.ts`).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const page = await loadMoreDiaryEntriesAction({ filter, sort, cursor, period });
      setEntries((previous) => [...previous, ...page.entries]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setAnnouncement(
        page.entries.length === 1
          ? "1 more entry loaded"
          : `${page.entries.length} more entries loaded`,
      );
    });
  }

  const groups = groupDiaryEntries(entries, new Date(), mounted);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        // Session grouping (`groupDiarySessions`) runs per date group,
        // never across days — a "session" is a same-day binge sitting
        // (see docs/diary.md, "Viewing session grouping"), and applying
        // it after date grouping (not before) keeps the two concerns
        // independent: date grouping owns *which day* an entry displays
        // under, session grouping only ever compresses presentation
        // *within* a day that's already been decided.
        const rowGroups = groupDiarySessions(group.entries);
        return (
          <section key={group.key} aria-labelledby={`diary-date-${group.key}`}>
            <h2
              id={`diary-date-${group.key}`}
              className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {group.label}
            </h2>
            <ul className="flex flex-col divide-y divide-border">
              {rowGroups.map((rowGroup) =>
                rowGroup.kind === "single" ? (
                  <DiaryEntryRow key={rowGroup.entry.id} entry={rowGroup.entry} />
                ) : (
                  <DiaryEpisodeSession key={rowGroup.key} entries={rowGroup.entries} />
                ),
              )}
            </ul>
          </section>
        );
      })}

      {hasMore ? (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={loadMore}
          loading={isPending}
        >
          Load more
        </Button>
      ) : null}

      {/* Non-noisy: announces once per Load More, never per hydrated
          field — see docs/diary.md, "Dynamic loading accessibility". */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
