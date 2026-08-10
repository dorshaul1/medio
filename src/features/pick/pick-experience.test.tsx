import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscoveryMovieCandidate, PickResult } from "@/server/pick/types";
import { PickExperience } from "./pick-experience";

const refreshPickAction = vi.fn();
vi.mock("./pick-actions", () => ({
  refreshPickAction: (...args: unknown[]) => refreshPickAction(...args),
}));

const routerReplace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/pick",
  useRouter: () => ({ replace: routerReplace }),
}));

// PickCard (rendered by PickExperience) reaches these real Server Action
// modules — mocked here the same way pick-card.test.tsx does, so this
// file never pulls in the real `server-only` tracking/planning domain.
vi.mock("@/features/movies/movie-tracking-actions", () => ({
  markMovieWatchedAction: vi.fn(),
}));
vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: vi.fn(),
  startWatchingShowAction: vi.fn(),
}));
vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: vi.fn(),
  removePlanningItemAction: vi.fn(),
}));

function movie(id: number, title: string): DiscoveryMovieCandidate {
  return {
    kind: "discoveryMovie",
    mediaType: "movie",
    mediaProviderId: id,
    title,
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 100,
    source: "popular",
    seedTitle: null,
  };
}

const EMPTY_RESULT: PickResult = { primary: null, alternatives: [], relaxedTimeConstraint: false };

beforeEach(() => {
  vi.clearAllMocks();
  routerReplace.mockClear();
});

describe("PickExperience", () => {
  it("shows an honest empty state when there is nothing to recommend", () => {
    render(
      <PickExperience
        initialResult={EMPTY_RESULT}
        initialContext={{ mediaType: "any", timeBudgetMinutes: null }}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByText(/Nothing matches right now/)).toBeInTheDocument();
  });

  it("announces when the time constraint was relaxed to produce a result", () => {
    const result: PickResult = {
      primary: { candidate: movie(1, "A Movie"), reasons: [{ kind: "popularDiscovery" }] },
      alternatives: [],
      relaxedTimeConstraint: true,
    };
    render(
      <PickExperience
        initialResult={result}
        initialContext={{ mediaType: "any", timeBudgetMinutes: 35 }}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/widened the search/);
  });

  it("re-runs the decision engine with the new context when Format changes", async () => {
    const user = userEvent.setup();
    refreshPickAction.mockResolvedValue(EMPTY_RESULT);
    render(
      <PickExperience
        initialResult={EMPTY_RESULT}
        initialContext={{ mediaType: "any", timeBudgetMinutes: null }}
        defaultSaveIntent="watchlist"
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Movie" }));

    expect(refreshPickAction).toHaveBeenCalledWith(
      { mediaType: "movie", timeBudgetMinutes: null },
      [],
      0,
    );
  });

  it("syncs the URL when Format changes, but never for a session-only exclusion", async () => {
    const user = userEvent.setup();
    refreshPickAction.mockResolvedValue(EMPTY_RESULT);
    render(
      <PickExperience
        initialResult={EMPTY_RESULT}
        initialContext={{ mediaType: "any", timeBudgetMinutes: null }}
        defaultSaveIntent="watchlist"
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Movie" }));
    expect(routerReplace).toHaveBeenCalledWith("/pick?format=movie", { scroll: false });
  });

  it("re-runs the decision engine with the new time budget when Time changes", async () => {
    const user = userEvent.setup();
    refreshPickAction.mockResolvedValue(EMPTY_RESULT);
    render(
      <PickExperience
        initialResult={EMPTY_RESULT}
        initialContext={{ mediaType: "any", timeBudgetMinutes: null }}
        defaultSaveIntent="watchlist"
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Quick" }));

    expect(refreshPickAction).toHaveBeenCalledWith(
      { mediaType: "any", timeBudgetMinutes: 35 },
      [],
      0,
    );
    expect(routerReplace).toHaveBeenCalledWith("/pick?time=quick", { scroll: false });
  });

  it("visually marks the selected Time option as checked, and only that one", async () => {
    const user = userEvent.setup();
    refreshPickAction.mockResolvedValue(EMPTY_RESULT);
    render(
      <PickExperience
        initialResult={EMPTY_RESULT}
        initialContext={{ mediaType: "any", timeBudgetMinutes: null }}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByRole("radio", { name: "Any length" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Quick" })).toHaveAttribute("aria-checked", "false");

    await user.click(screen.getByRole("radio", { name: "Quick" }));

    expect(screen.getByRole("radio", { name: "Quick" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Any length" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("never repeats the same recommendation immediately after Another pick", async () => {
    const user = userEvent.setup();
    const result: PickResult = {
      primary: { candidate: movie(1, "A Movie"), reasons: [{ kind: "popularDiscovery" }] },
      alternatives: [],
      relaxedTimeConstraint: false,
    };
    refreshPickAction.mockResolvedValue({
      primary: { candidate: movie(2, "Another Movie"), reasons: [{ kind: "popularDiscovery" }] },
      alternatives: [],
      relaxedTimeConstraint: false,
    });

    render(
      <PickExperience
        initialResult={result}
        initialContext={{ mediaType: "any", timeBudgetMinutes: null }}
        defaultSaveIntent="watchlist"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Another pick" }));

    expect(refreshPickAction).toHaveBeenCalledWith(
      { mediaType: "any", timeBudgetMinutes: null },
      [1],
      0,
    );
    expect(await screen.findByText(/Another Movie/)).toBeInTheDocument();
  });
});
