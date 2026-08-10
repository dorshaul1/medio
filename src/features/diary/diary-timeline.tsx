"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { DiaryCursor, DiaryEntry, DiaryFilter, DiarySort } from "@/server/diary/types";
import { loadMoreDiaryEntriesAction } from "./diary-actions";
import { groupDiaryEntries } from "./diary-date-grouping";
import { DiaryEntryRow } from "./diary-entry-row";

// Diary's client-side timeline layer — deliberately narrow: local-
// timezone date grouping (see docs/diary.md, "Date grouping") and "Load
// more" pagination are the only two things that genuinely need the
// browser here. Data fetching/hydration/authorization stay entirely
// server-side (`server/diary/queries.ts`, called from the page and from
// `loadMoreDiaryEntriesAction`) — this component only ever receives
// already-hydrated `DiaryEntry`s, never queries anything itself.
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
}: {
  initialEntries: readonly DiaryEntry[];
  initialCursor: DiaryCursor | null;
  initialHasMore: boolean;
  filter: DiaryFilter;
  sort: DiarySort;
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
      const page = await loadMoreDiaryEntriesAction({ filter, sort, cursor });
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
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`diary-date-${group.key}`}>
          <h2
            id={`diary-date-${group.key}`}
            className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            {group.label}
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {group.entries.map((entry) => (
              <DiaryEntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      ))}

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
