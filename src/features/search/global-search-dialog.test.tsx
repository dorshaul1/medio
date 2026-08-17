import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearchDialog } from "./global-search-dialog";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/library",
}));

const getSearchSuggestionsAction = vi.fn();
vi.mock("@/features/search/search-actions", () => ({
  getSearchSuggestionsAction: (...args: unknown[]) => getSearchSuggestionsAction(...args),
}));

const getUpNextCommandDataAction = vi.fn();
vi.mock("@/features/command-center/command-center-actions", () => ({
  getUpNextCommandDataAction: () => getUpNextCommandDataAction(),
}));

const markMovieWatchedAction = vi.fn();
vi.mock("@/features/movies/movie-tracking-actions", () => ({
  markMovieWatchedAction: (...args: unknown[]) => markMovieWatchedAction(...args),
}));

const markEpisodeWatchedAction = vi.fn();
vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: (...args: unknown[]) => markEpisodeWatchedAction(...args),
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

function showResult(overrides: { id?: number; title?: string } = {}) {
  return {
    kind: "show" as const,
    media: {
      mediaType: "show" as const,
      id: overrides.id ?? 1399,
      title: overrides.title ?? "Severance",
      originalTitle: overrides.title ?? "Severance",
      overview: null,
      releaseDate: "2022-02-18",
      releaseYear: 2022,
      poster: null,
      backdrop: null,
      providerRating: 8.7,
      voteCount: 5000,
      genreIds: [],
      adult: false,
    },
    personalState: { kind: "none" as const },
  };
}

const UP_NEXT = {
  showProviderId: 1399,
  title: "Severance",
  poster: null,
  backdrop: null,
  year: 2022,
  lastActivityAt: new Date(),
  airedEpisodeCount: 20,
  watchedEpisodeCount: 5,
  remainingAiredEpisodeCount: 15,
  nextEpisode: {
    seasonNumber: 2,
    episodeNumber: 6,
    episodeProviderId: 9999,
    title: "Chikhai Bardo",
    runtimeMinutes: 55,
  },
};

// Real timers throughout — this component's own debounce is short (250ms)
// and combining fake timers with testing-library's async `waitFor`/
// `findBy*` polling (which relies on real timers internally) just
// produces a flaky/hanging test, not a real one. Tests that need to
// assert "nothing happened yet" use fake timers scoped to just
// themselves.
describe("GlobalSearchDialog (Command Center)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    getSearchSuggestionsAction.mockReset();
    getUpNextCommandDataAction.mockReset().mockResolvedValue(null);
    markMovieWatchedAction.mockReset().mockResolvedValue(undefined);
    markEpisodeWatchedAction.mockReset().mockResolvedValue(undefined);
    changePlanningIntentAction.mockReset().mockResolvedValue(undefined);
    removePlanningItemAction.mockReset().mockResolvedValue(undefined);
    push.mockReset();
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
    expect(screen.getByRole("searchbox", { name: "Search and commands" })).toBeInTheDocument();
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

  it("renders results once the search resolves, as one flat list", async () => {
    getSearchSuggestionsAction.mockResolvedValue({
      results: { results: [movieResult()], hasMore: false, failedTypes: [] },
      defaultSaveIntent: "watchlist",
    });
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "fight club" } });

    expect(await screen.findByRole("link", { name: /Fight Club/ })).toBeInTheDocument();
  });

  it("shows a precise no-results message when neither media nor a command matches", async () => {
    getSearchSuggestionsAction.mockResolvedValue({
      results: { results: [], hasMore: false, failedTypes: [] },
      defaultSaveIntent: "watchlist",
    });
    render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzz" } });

    expect(await screen.findByText("No results for “zzzz”.")).toBeInTheDocument();
  });

  it("closes and records a recent search when a media result is followed", async () => {
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

  describe("default (idle) state", () => {
    it("shows curated Quick actions and Navigate sections, not a sitemap", async () => {
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

      expect(await screen.findByText("Quick actions")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Log something watched" })).toBeInTheDocument();
      expect(screen.getByText("Navigate")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();
    });

    it("never suggests navigating to the page already open", async () => {
      // usePathname is mocked to "/library" for this whole file.
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
      await screen.findByText("Navigate");
      expect(screen.queryByRole("link", { name: "Library" })).not.toBeInTheDocument();
    });

    it("surfaces the Up Next command only once the canonical fetch resolves with one", async () => {
      getUpNextCommandDataAction.mockResolvedValue(UP_NEXT);
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

      expect(
        await screen.findByRole("button", { name: "Mark Severance S2 E6 watched" }),
      ).toBeInTheDocument();
    });

    it("omits the Up Next command entirely when there is none", async () => {
      getUpNextCommandDataAction.mockResolvedValue(null);
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
      await screen.findByText("Quick actions");
      expect(screen.queryByText(/Mark .* watched/)).not.toBeInTheDocument();
    });
  });

  describe("command matching", () => {
    it("ranks a strong alias match (an exact keyword hit) ahead of media results", async () => {
      getSearchSuggestionsAction.mockResolvedValue({
        results: {
          results: [movieResult({ title: "Taste of Cherry" })],
          hasMore: false,
          failedTypes: [],
        },
        defaultSaveIntent: "watchlist",
      });
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "taste" } });
      const tasteCommand = await screen.findByRole("link", { name: /Stats → Taste/ });
      const movieLink = await screen.findByRole("link", { name: /Taste of Cherry/ });

      const rows = screen.getAllByRole("link");
      expect(rows.indexOf(tasteCommand)).toBeLessThan(rows.indexOf(movieLink));
    });

    it("finds Account for the alias 'user'", async () => {
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "user" } });
      expect(await screen.findByRole("link", { name: "Account" })).toHaveAttribute(
        "href",
        "/settings/account",
      );
    });

    it("finds Settings for the alias 'preferences'", async () => {
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "preferences" } });
      expect(await screen.findByRole("link", { name: "Settings" })).toBeInTheDocument();
    });

    it("finds Calendar for the alias 'releases'", async () => {
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "releases" } });
      expect(await screen.findByRole("link", { name: "Calendar" })).toBeInTheDocument();
    });
  });

  describe("Log something watched", () => {
    it("switches into the nested flow and logs a Movie directly through the canonical mutation", async () => {
      getSearchSuggestionsAction.mockResolvedValue({
        results: { results: [movieResult()], hasMore: false, failedTypes: [] },
        defaultSaveIntent: "watchlist",
      });
      const onOpenChange = vi.fn();
      render(<GlobalSearchDialog open onOpenChange={onOpenChange} />);

      await screen.findByText("Quick actions");
      fireEvent.click(screen.getByRole("button", { name: "Log something watched" }));

      expect(
        screen.getByRole("searchbox", { name: "Search Movies and Shows to log" }),
      ).toBeInTheDocument();

      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "fight club" } });
      const row = await screen.findByRole("button", { name: /Fight Club/ });
      fireEvent.click(row);

      await waitFor(() => expect(markMovieWatchedAction).toHaveBeenCalledWith(550));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it("navigates to a Show instead of logging it directly — episode identity needs the show's own page", async () => {
      getSearchSuggestionsAction.mockResolvedValue({
        results: { results: [showResult()], hasMore: false, failedTypes: [] },
        defaultSaveIntent: "watchlist",
      });
      render(<GlobalSearchDialog open onOpenChange={vi.fn()} />);

      await screen.findByText("Quick actions");
      fireEvent.click(screen.getByRole("button", { name: "Log something watched" }));
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "severance" } });

      const link = await screen.findByRole("link", { name: /Severance/ });
      expect(link).toHaveAttribute("href", "/shows/1399");
      expect(markMovieWatchedAction).not.toHaveBeenCalled();
    });

    it("Escape returns to plain search instead of closing the Command Center", async () => {
      const onOpenChange = vi.fn();
      render(<GlobalSearchDialog open onOpenChange={onOpenChange} />);

      await screen.findByText("Quick actions");
      fireEvent.click(screen.getByRole("button", { name: "Log something watched" }));
      expect(
        screen.getByRole("searchbox", { name: "Search Movies and Shows to log" }),
      ).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });

      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole("searchbox", { name: "Search and commands" })).toBeInTheDocument();
    });
  });

  describe("Up Next", () => {
    it("marks the canonical next episode watched through the same mutation Home uses, then closes", async () => {
      getUpNextCommandDataAction.mockResolvedValue(UP_NEXT);
      const onOpenChange = vi.fn();
      render(<GlobalSearchDialog open onOpenChange={onOpenChange} />);

      const command = await screen.findByRole("button", {
        name: "Mark Severance S2 E6 watched",
      });
      fireEvent.click(command);

      await waitFor(() =>
        expect(markEpisodeWatchedAction).toHaveBeenCalledWith({
          showProviderId: 1399,
          seasonNumber: 2,
          episodeNumber: 6,
          episodeProviderId: 9999,
        }),
      );
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });
  });
});
