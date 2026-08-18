import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LibraryItem, LibraryNextEpisode } from "@/server/library/types";
import { LibraryItemRow } from "./library-item-row";

vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: vi.fn(),
  removePlanningItemAction: vi.fn(),
}));
vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: vi.fn(),
  startWatchingShowAction: vi.fn(),
}));
vi.mock("@/features/movies/movie-tracking-actions", () => ({
  markMovieWatchedAction: vi.fn(),
}));
vi.mock("@/features/settings/settings-actions", () => ({
  updatePreferencesAction: vi.fn().mockResolvedValue(undefined),
}));

const BASE = {
  mediaProviderId: 550,
  title: "Fight Club",
  poster: null,
  year: 1999,
  personalActivityAt: new Date("2024-01-01"),
  addedAt: new Date("2024-01-01"),
};

const NEXT_EPISODE: LibraryNextEpisode = {
  seasonNumber: 2,
  episodeNumber: 4,
  episodeProviderId: 12345,
  title: "The Return",
};

function renderInList(item: LibraryItem) {
  render(
    <ul>
      <LibraryItemRow item={item} />
    </ul>,
  );
}

describe("LibraryItemRow", () => {
  it("renders one link whose accessible name includes the title — not an unlabeled poster link", () => {
    renderInList({ ...BASE, kind: "planned-movie", mediaType: "movie", intent: "watchlist" });

    const links = screen.getAllByRole("link", { name: /Fight Club/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/movies/550");
  });

  it("shows year and intent for a planned movie", () => {
    renderInList({ ...BASE, kind: "planned-movie", mediaType: "movie", intent: "backlog" });
    expect(screen.getByText("1999 · Backlog")).toBeInTheDocument();
  });

  it("shows year and watch count for a watched movie", () => {
    renderInList({
      ...BASE,
      kind: "watched-movie",
      mediaType: "movie",
      watchCount: 3,
      lastWatchedAt: new Date("2024-01-01"),
    });
    expect(screen.getByText("1999 · Watched 3×")).toBeInTheDocument();
  });

  it("shows the singular Watched label for one viewing", () => {
    renderInList({
      ...BASE,
      kind: "watched-movie",
      mediaType: "movie",
      watchCount: 1,
      lastWatchedAt: new Date("2024-01-01"),
    });
    expect(screen.getByText("1999 · Watched")).toBeInTheDocument();
  });

  it("shows a tracked show's next-episode context in place of a redundant 'Watching' label", () => {
    renderInList({
      ...BASE,
      mediaType: "show",
      kind: "tracked-show",
      explicitState: "watching",
      derivedState: "watching",
      airedEpisodeCount: 10,
      watchedEpisodeCount: 4,
      nextEpisode: NEXT_EPISODE,
    });
    expect(screen.getByText("S2 E4 next")).toBeInTheDocument();
    expect(screen.queryByText("Watching")).not.toBeInTheDocument();
    expect(screen.getByText("4 / 10 aired")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("falls back to the plain state label when next-episode hydration didn't produce one", () => {
    renderInList({
      ...BASE,
      mediaType: "show",
      kind: "tracked-show",
      explicitState: "watching",
      derivedState: "watching",
      airedEpisodeCount: 10,
      watchedEpisodeCount: 4,
      nextEpisode: null,
    });
    expect(screen.getByText("Watching")).toBeInTheDocument();
  });

  it("keeps the 'On hold' label alongside next-episode context once paused", () => {
    renderInList({
      ...BASE,
      mediaType: "show",
      kind: "tracked-show",
      explicitState: "on_hold",
      derivedState: "on_hold",
      airedEpisodeCount: 5,
      watchedEpisodeCount: 2,
      nextEpisode: NEXT_EPISODE,
    });
    expect(screen.getByText("On hold · S2 E4 next")).toBeInTheDocument();
  });

  it("offers a secondary actions menu for planned items only", () => {
    renderInList({ ...BASE, kind: "planned-movie", mediaType: "movie", intent: "watchlist" });
    expect(screen.getByRole("button", { name: "More actions for Fight Club" })).toBeInTheDocument();
  });

  it("does not offer an overflow actions menu for a watched movie", () => {
    renderInList({
      ...BASE,
      kind: "watched-movie",
      mediaType: "movie",
      watchCount: 1,
      lastWatchedAt: new Date(),
    });
    expect(screen.queryByRole("button", { name: /More actions/ })).not.toBeInTheDocument();
  });

  it("does not offer an overflow actions menu for a tracked show", () => {
    renderInList({
      ...BASE,
      mediaType: "show",
      kind: "tracked-show",
      explicitState: "dropped",
      derivedState: "dropped",
      airedEpisodeCount: 5,
      watchedEpisodeCount: 0,
      nextEpisode: null,
    });
    expect(screen.queryByRole("button", { name: /More actions/ })).not.toBeInTheDocument();
  });

  it("offers a Mark watched quick action for an actively watching show with a known next episode", () => {
    renderInList({
      ...BASE,
      mediaType: "show",
      kind: "tracked-show",
      explicitState: "watching",
      derivedState: "watching",
      airedEpisodeCount: 10,
      watchedEpisodeCount: 4,
      nextEpisode: NEXT_EPISODE,
    });
    expect(
      screen.getByRole("button", { name: "Mark Fight Club S2 E4 watched" }),
    ).toBeInTheDocument();
  });

  it("disables the quick action while marking the next episode watched", async () => {
    const { markEpisodeWatchedAction } = await import("@/features/shows/show-tracking-actions");
    vi.mocked(markEpisodeWatchedAction).mockReturnValue(new Promise(() => {}));
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderInList({
      ...BASE,
      mediaType: "show",
      kind: "tracked-show",
      explicitState: "watching",
      derivedState: "watching",
      airedEpisodeCount: 10,
      watchedEpisodeCount: 4,
      nextEpisode: NEXT_EPISODE,
    });

    const button = screen.getByRole("button", { name: "Mark Fight Club S2 E4 watched" });
    await user.click(button);

    expect(button).toBeDisabled();
  });

  it("offers a Resume quick action for an on-hold show", () => {
    renderInList({
      ...BASE,
      mediaType: "show",
      kind: "tracked-show",
      explicitState: "on_hold",
      derivedState: "on_hold",
      airedEpisodeCount: 5,
      watchedEpisodeCount: 0,
      nextEpisode: null,
    });
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("offers no quick action for a caught-up, waiting, completed, or dropped show", () => {
    for (const derivedState of ["caught_up", "waiting", "completed", "dropped"] as const) {
      const { unmount } = render(
        <ul>
          <LibraryItemRow
            item={{
              ...BASE,
              mediaType: "show",
              kind: "tracked-show",
              explicitState: derivedState === "dropped" ? "dropped" : "watching",
              derivedState,
              airedEpisodeCount: 5,
              watchedEpisodeCount: 5,
              nextEpisode: null,
            }}
          />
        </ul>,
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("offers a Mark watched quick action for a planned movie", () => {
    renderInList({ ...BASE, kind: "planned-movie", mediaType: "movie", intent: "watchlist" });
    expect(screen.getByRole("button", { name: "Mark Fight Club watched" })).toBeInTheDocument();
  });

  it("offers no quick action for a watched movie", () => {
    renderInList({
      ...BASE,
      kind: "watched-movie",
      mediaType: "movie",
      watchCount: 1,
      lastWatchedAt: new Date(),
    });
    expect(
      screen.queryByRole("button", { name: "Mark Fight Club watched" }),
    ).not.toBeInTheDocument();
  });

  it("shows watched status text for a watched movie", () => {
    renderInList({
      ...BASE,
      kind: "watched-movie",
      mediaType: "movie",
      watchCount: 1,
      lastWatchedAt: new Date(),
    });
    expect(screen.getByText("1999 · Watched")).toBeInTheDocument();
  });

  it("shows completed status text for a completed show", () => {
    renderInList({
      ...BASE,
      mediaType: "show",
      kind: "tracked-show",
      explicitState: "watching",
      derivedState: "completed",
      airedEpisodeCount: 10,
      watchedEpisodeCount: 10,
      nextEpisode: null,
    });
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
