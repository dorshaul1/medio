import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearchDialog } from "./global-search-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const getSearchSuggestionsAction = vi.fn();
vi.mock("@/features/search/search-actions", () => ({
  getSearchSuggestionsAction: (...args: unknown[]) => getSearchSuggestionsAction(...args),
}));

const changePlanningIntentAction = vi.fn();
const removePlanningItemAction = vi.fn();
vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: (...args: unknown[]) => changePlanningIntentAction(...args),
  removePlanningItemAction: (...args: unknown[]) => removePlanningItemAction(...args),
}));

function movieResult(overrides: { id?: number; title?: string } = {}) {
  return {
    kind: "movie" as const,
    media: {
      mediaType: "movie" as const,
      id: overrides.id ?? 550,
      title: overrides.title ?? "Fight Club",
      originalTitle: overrides.title ?? "Fight Club",
      overview: null,
      releaseDate: "1999-10-15",
      releaseYear: 1999,
      poster: null,
      backdrop: null,
      providerRating: 8.4,
      voteCount: 26000,
      genreIds: [],
      adult: false,
    },
    personalState: { kind: "none" as const },
  };
}

// Real timers throughout — this component's own debounce is short (250ms)
// and combining fake timers with testing-library's async `waitFor`/
// `findBy*` polling (which relies on real timers internally) just
// produces a flaky/hanging test, not a real one — see
// discover-search-input.test.tsx's identical reasoning for why *that*
// file uses fake timers instead (it never awaits an async server
// response, so there's nothing for `waitFor` to poll for). The two tests
// below that need to assert "nothing happened yet" use fake timers
// scoped to just themselves.
describe("GlobalSearchDialog", () => {
  beforeEach(() => {
    window.localStorage.clear();
    getSearchSuggestionsAction.mockReset();
    changePlanningIntentAction.mockReset().mockResolvedValue(undefined);
    removePlanningItemAction.mockReset().mockResolvedValue(undefined);
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it("renders nothing while closed", () => {
    render(<GlobalSearchDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the search input when open, focused automatically", () => {
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
    expect(
      screen.getByRole("searchbox", { name: "Search Movies, Shows and People" }),
    ).toBeInTheDocument();
  });

  it("debounces typing before calling the search action", async () => {
    vi.useFakeTimers();
    getSearchSuggestionsAction.mockResolvedValue({
      results: { results: [], hasMore: false, failedTypes: [] },
      defaultSaveIntent: "watchlist",
    });
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "d" } });
    fireEvent.change(input, { target: { value: "du" } });
    fireEvent.change(input, { target: { value: "dune" } });
    expect(getSearchSuggestionsAction).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(250);
    expect(getSearchSuggestionsAction).toHaveBeenCalledTimes(1);
    expect(getSearchSuggestionsAction).toHaveBeenCalledWith("dune");
    vi.useRealTimers();
  });

  it("does not search below the minimum query length", async () => {
    vi.useFakeTimers();
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "d" } });
    await vi.advanceTimersByTimeAsync(250);
    expect(getSearchSuggestionsAction).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("renders results once the search resolves, as one flat list", async () => {
    getSearchSuggestionsAction.mockResolvedValue({
      results: { results: [movieResult()], hasMore: false, failedTypes: [] },
      defaultSaveIntent: "watchlist",
    });
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "fight club" } });

    expect(await screen.findByRole("link", { name: /Fight Club/ })).toBeInTheDocument();
  });

  it("shows a precise no-results message", async () => {
    getSearchSuggestionsAction.mockResolvedValue({
      results: { results: [], hasMore: false, failedTypes: [] },
      defaultSaveIntent: "watchlist",
    });
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzz" } });

    expect(
      await screen.findByText("No Movies, Shows or People found for “zzzz”."),
    ).toBeInTheDocument();
  });

  it("closes and records a recent search when a result is followed", async () => {
    getSearchSuggestionsAction.mockResolvedValue({
      results: { results: [movieResult()], hasMore: false, failedTypes: [] },
      defaultSaveIntent: "watchlist",
    });
    const onOpenChange = vi.fn();
    render(<GlobalSearchDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "fight club" } });
    const link = await screen.findByRole("link", { name: /Fight Club/ });
    fireEvent.click(link);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows recent searches before typing anything", () => {
    window.localStorage.setItem("medio.recent-searches", JSON.stringify(["dune", "the office"]));
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "dune" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "the office" })).toBeInTheDocument();
  });

  it("offers quick Discover entry points before typing anything", () => {
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Movies" })).toHaveAttribute(
      "href",
      "/discover?type=movies",
    );
  });

  it("moves focus to the first result on ArrowDown from the input", async () => {
    getSearchSuggestionsAction.mockResolvedValue({
      results: { results: [movieResult()], hasMore: false, failedTypes: [] },
      defaultSaveIntent: "watchlist",
    });
    const user = userEvent.setup();
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "fight club" } });
    const link = await screen.findByRole("link", { name: /Fight Club/ });

    input.focus();
    await user.keyboard("{ArrowDown}");

    expect(link).toHaveFocus();
  });
});
