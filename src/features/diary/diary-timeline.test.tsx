import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DiaryCursor, DiaryEntry, MovieDiaryEntry } from "@/server/diary/types";
import { DiaryTimeline } from "./diary-timeline";

const loadMoreDiaryEntriesAction = vi.fn();
vi.mock("./diary-actions", () => ({
  loadMoreDiaryEntriesAction: (...args: unknown[]) => loadMoreDiaryEntriesAction(...args),
}));

// Rendered entries transitively mount `DiaryEntryMenu`, which imports
// these Server Actions — mocked the same way `library-item-row.test.tsx`
// mocks the equivalent tracking actions, so this Client Component test
// never pulls in the real `server-only`-guarded tracking domain.
vi.mock("@/features/movies/movie-tracking-actions", () => ({
  removeMovieWatchEventAction: vi.fn(),
  updateMovieWatchedAtAction: vi.fn(),
}));
vi.mock("@/features/shows/show-tracking-actions", () => ({
  removeEpisodeWatchEventAction: vi.fn(),
  updateEpisodeWatchedAtAction: vi.fn(),
}));

function movieEntry(overrides: Partial<MovieDiaryEntry> = {}): MovieDiaryEntry {
  return {
    kind: "movie",
    id: "event-1",
    watchedAt: new Date(2024, 0, 5),
    ordinal: 1,
    movieProviderId: 550,
    title: "Fight Club",
    year: 1999,
    poster: null,
    ...overrides,
  };
}

describe("DiaryTimeline", () => {
  it("groups entries under date headings", () => {
    // The current year, so the group label omits it (see
    // `diary-date-grouping.test.ts` for the year-inclusion rule itself).
    const year = new Date().getFullYear();
    const entries: DiaryEntry[] = [
      movieEntry({ id: "a", watchedAt: new Date(year, 0, 5) }),
      movieEntry({ id: "b", title: "Inception", watchedAt: new Date(year, 0, 3) }),
    ];

    render(
      <DiaryTimeline
        initialEntries={entries}
        initialCursor={null}
        initialHasMore={false}
        filter="all"
        sort="newest"
      />,
    );

    expect(screen.getByRole("heading", { name: "January 5" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "January 3" })).toBeInTheDocument();
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("does not render a Load more button when there is nothing more", () => {
    render(
      <DiaryTimeline
        initialEntries={[movieEntry()]}
        initialCursor={null}
        initialHasMore={false}
        filter="all"
        sort="newest"
      />,
    );

    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("Load more appends the next page and updates the cursor/hasMore state", async () => {
    const user = userEvent.setup();
    const cursor: DiaryCursor = {
      watchedAt: new Date(2024, 0, 5),
      eventType: "movie",
      id: "event-1",
    };
    loadMoreDiaryEntriesAction.mockResolvedValue({
      entries: [
        movieEntry({ id: "event-2", title: "The Prestige", watchedAt: new Date(2024, 0, 1) }),
      ],
      nextCursor: null,
      hasMore: false,
    });

    render(
      <DiaryTimeline
        initialEntries={[movieEntry()]}
        initialCursor={cursor}
        initialHasMore={true}
        filter="all"
        sort="newest"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(loadMoreDiaryEntriesAction).toHaveBeenCalledWith({
      filter: "all",
      sort: "newest",
      cursor,
    });
    expect(await screen.findByText("The Prestige")).toBeInTheDocument();
    // hasMore became false — the button is gone.
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("announces how many entries were added after Load more", async () => {
    const user = userEvent.setup();
    const cursor: DiaryCursor = {
      watchedAt: new Date(2024, 0, 5),
      eventType: "movie",
      id: "event-1",
    };
    loadMoreDiaryEntriesAction.mockResolvedValue({
      entries: [movieEntry({ id: "event-2" }), movieEntry({ id: "event-3" })],
      nextCursor: null,
      hasMore: false,
    });

    render(
      <DiaryTimeline
        initialEntries={[movieEntry()]}
        initialCursor={cursor}
        initialHasMore={true}
        filter="all"
        sort="newest"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByRole("status")).toHaveTextContent("2 more entries loaded");
  });

  // Regression test for a real bug: an Edit/Delete action revalidates
  // `/library/diary`, which re-renders the page and passes this
  // component fresh `initial*` props — but `useState`'s initializer only
  // runs on mount, so without an explicit resync effect the timeline
  // kept showing its own stale entries forever after an edit/delete (see
  // the component's own comment).
  it("resyncs to fresh initialEntries when they change — e.g. after an Edit/Delete revalidation", () => {
    const original = [movieEntry({ id: "a", title: "Fight Club" })];
    const { rerender } = render(
      <DiaryTimeline
        initialEntries={original}
        initialCursor={null}
        initialHasMore={false}
        filter="all"
        sort="newest"
      />,
    );
    expect(screen.getByText("Fight Club")).toBeInTheDocument();

    const revalidated = [movieEntry({ id: "b", title: "Inception" })];
    rerender(
      <DiaryTimeline
        initialEntries={revalidated}
        initialCursor={null}
        initialHasMore={false}
        filter="all"
        sort="newest"
      />,
    );

    expect(screen.queryByText("Fight Club")).not.toBeInTheDocument();
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });
});
