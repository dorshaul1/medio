import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ContinueEpisodeCandidate,
  DiscoveryMovieCandidate,
  PickRecommendation,
  SavedMovieCandidate,
  SavedShowCandidate,
} from "@/server/pick/types";
import { AlternativePickCard, PrimaryPickCard } from "./pick-card";

const markMovieWatchedAction = vi.fn();
vi.mock("@/features/movies/movie-tracking-actions", () => ({
  markMovieWatchedAction: (...args: unknown[]) => markMovieWatchedAction(...args),
}));

const markEpisodeWatchedAction = vi.fn();
const startWatchingShowAction = vi.fn();
vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: (...args: unknown[]) => markEpisodeWatchedAction(...args),
  startWatchingShowAction: (...args: unknown[]) => startWatchingShowAction(...args),
}));

const changePlanningIntentAction = vi.fn();
const removePlanningItemAction = vi.fn();
vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: (...args: unknown[]) => changePlanningIntentAction(...args),
  removePlanningItemAction: (...args: unknown[]) => removePlanningItemAction(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  markMovieWatchedAction.mockResolvedValue(undefined);
  markEpisodeWatchedAction.mockResolvedValue(undefined);
  startWatchingShowAction.mockResolvedValue(undefined);
  changePlanningIntentAction.mockResolvedValue(undefined);
});

function continueRecommendation(): PickRecommendation {
  const candidate: ContinueEpisodeCandidate = {
    kind: "continueEpisode",
    mediaType: "show",
    mediaProviderId: 1399,
    title: "Winter's Watch",
    poster: null,
    backdrop: null,
    year: 2019,
    genres: [],
    runtimeMinutes: 50,
    remainingAiredEpisodeCount: 3,
    isFinishSoon: false,
    lastActivityAt: new Date("2000-01-01T00:00:00Z"),
    nextEpisode: { seasonNumber: 2, episodeNumber: 4, episodeProviderId: 900 },
  };
  return { candidate, reasons: [{ kind: "continueActiveShow" }] };
}

function savedMovieRecommendation(): PickRecommendation {
  const candidate: SavedMovieCandidate = {
    kind: "savedMovie",
    mediaType: "movie",
    mediaProviderId: 550,
    title: "Fight Club",
    poster: null,
    backdrop: null,
    year: 1999,
    genres: [],
    runtimeMinutes: 139,
    intent: "backlog",
  };
  return { candidate, reasons: [{ kind: "backlogIntent" }] };
}

function savedShowRecommendation(): PickRecommendation {
  const candidate: SavedShowCandidate = {
    kind: "savedShow",
    mediaType: "show",
    mediaProviderId: 1396,
    title: "Breaking Bad",
    poster: null,
    backdrop: null,
    year: 2008,
    genres: [],
    runtimeMinutes: 47,
    intent: "watchlist",
  };
  return { candidate, reasons: [{ kind: "watchlistIntent" }] };
}

function discoveryMovieRecommendation(): PickRecommendation {
  const candidate: DiscoveryMovieCandidate = {
    kind: "discoveryMovie",
    mediaType: "movie",
    mediaProviderId: 27205,
    title: "Inception",
    poster: null,
    backdrop: null,
    year: 2010,
    genres: [],
    runtimeMinutes: 148,
    source: "popular",
    seedTitle: null,
  };
  return { candidate, reasons: [{ kind: "popularDiscovery" }] };
}

describe("PrimaryPickCard", () => {
  it("shows Mark watched for a continuation and calls the shared episode action", async () => {
    const user = userEvent.setup();
    render(
      <PrimaryPickCard
        recommendation={continueRecommendation()}
        defaultSaveIntent="watchlist"
        isBusy={false}
        onTracked={vi.fn()}
        onAnotherPick={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Mark watched/ }));
    expect(markEpisodeWatchedAction).toHaveBeenCalledWith({
      showProviderId: 1399,
      seasonNumber: 2,
      episodeNumber: 4,
      episodeProviderId: 900,
    });
  });

  it("calls onTracked after a quick action completes", async () => {
    const user = userEvent.setup();
    const onTracked = vi.fn();
    render(
      <PrimaryPickCard
        recommendation={savedMovieRecommendation()}
        defaultSaveIntent="watchlist"
        isBusy={false}
        onTracked={onTracked}
        onAnotherPick={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Mark watched/ }));
    expect(markMovieWatchedAction).toHaveBeenCalledWith(550);
    expect(onTracked).toHaveBeenCalled();
  });

  it("shows Start watching for a saved show and calls the shared tracking action", async () => {
    const user = userEvent.setup();
    render(
      <PrimaryPickCard
        recommendation={savedShowRecommendation()}
        defaultSaveIntent="watchlist"
        isBusy={false}
        onTracked={vi.fn()}
        onAnotherPick={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Start watching/ }));
    expect(startWatchingShowAction).toHaveBeenCalledWith(1396);
  });

  it("offers Save (via PlanningControl) for a discovery pick, respecting the default save destination", async () => {
    const user = userEvent.setup();
    render(
      <PrimaryPickCard
        recommendation={discoveryMovieRecommendation()}
        defaultSaveIntent="backlog"
        isBusy={false}
        onTracked={vi.fn()}
        onAnotherPick={vi.fn()}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save Inception to Backlog" });
    await user.click(saveButton);
    expect(changePlanningIntentAction).toHaveBeenCalledWith("movie", 27205, "backlog");
  });

  it("never fabricates a match percentage in its reason text", () => {
    render(
      <PrimaryPickCard
        recommendation={continueRecommendation()}
        defaultSaveIntent="watchlist"
        isBusy={false}
        onTracked={vi.fn()}
        onAnotherPick={vi.fn()}
      />,
    );
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("calls onAnotherPick when its own dedicated control is used", async () => {
    const user = userEvent.setup();
    const onAnotherPick = vi.fn();
    render(
      <PrimaryPickCard
        recommendation={continueRecommendation()}
        defaultSaveIntent="watchlist"
        isBusy={false}
        onTracked={vi.fn()}
        onAnotherPick={onAnotherPick}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Another pick" }));
    expect(onAnotherPick).toHaveBeenCalled();
  });

  it("links the title to the real detail page", () => {
    render(
      <PrimaryPickCard
        recommendation={savedMovieRecommendation()}
        defaultSaveIntent="watchlist"
        isBusy={false}
        onTracked={vi.fn()}
        onAnotherPick={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /Fight Club/ })).toHaveAttribute("href", "/movies/550");
  });
});

describe("AlternativePickCard", () => {
  it("calls onNotNow with a precise accessible name, never removing the whole list item itself", async () => {
    const user = userEvent.setup();
    const onNotNow = vi.fn();
    render(
      <AlternativePickCard
        recommendation={savedShowRecommendation()}
        defaultSaveIntent="watchlist"
        onTracked={vi.fn()}
        onNotNow={onNotNow}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Not now, Breaking Bad" }));
    expect(onNotNow).toHaveBeenCalled();
  });

  it("shows exactly one contextual action alongside Not now", () => {
    render(
      <AlternativePickCard
        recommendation={savedMovieRecommendation()}
        defaultSaveIntent="watchlist"
        onTracked={vi.fn()}
        onNotNow={vi.fn()}
      />,
    );
    // Mark watched + Not now — never more than two controls on a compact card.
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
