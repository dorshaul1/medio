import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EpisodeWatchSummary } from "@/server/tracking/types";
import { EpisodeWatchControl } from "./episode-watch-control";

const markEpisodeWatchedAction = vi.fn();
const unmarkEpisodeWatchedAction = vi.fn();
vi.mock("./show-tracking-actions", () => ({
  markEpisodeWatchedAction: (...args: unknown[]) => markEpisodeWatchedAction(...args),
  unmarkEpisodeWatchedAction: (...args: unknown[]) => unmarkEpisodeWatchedAction(...args),
}));

beforeEach(() => {
  markEpisodeWatchedAction.mockReset();
  unmarkEpisodeWatchedAction.mockReset();
});

const UNWATCHED: EpisodeWatchSummary = { hasWatched: false, watchCount: 0, lastWatchedAt: null };
const WATCHED: EpisodeWatchSummary = {
  hasWatched: true,
  watchCount: 1,
  lastWatchedAt: new Date("2024-01-01"),
};

describe("EpisodeWatchControl", () => {
  it("offers a Mark watched control for an unwatched episode", () => {
    render(
      <EpisodeWatchControl
        showProviderId={1399}
        seasonNumber={1}
        episodeNumber={1}
        episodeProviderId={63056}
        summary={UNWATCHED}
      />,
    );
    expect(screen.getByRole("button", { name: "Mark episode 1 watched" })).toBeInTheDocument();
  });

  it("marks the episode watched when clicked", async () => {
    const user = userEvent.setup();
    render(
      <EpisodeWatchControl
        showProviderId={1399}
        seasonNumber={1}
        episodeNumber={1}
        episodeProviderId={63056}
        summary={UNWATCHED}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Mark episode 1 watched" }));

    expect(markEpisodeWatchedAction).toHaveBeenCalledWith({
      showProviderId: 1399,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeProviderId: 63056,
    });
    expect(unmarkEpisodeWatchedAction).not.toHaveBeenCalled();
  });

  it("labels an already-watched episode as not-watched, ready to toggle off", () => {
    render(
      <EpisodeWatchControl
        showProviderId={1399}
        seasonNumber={1}
        episodeNumber={1}
        episodeProviderId={63056}
        summary={WATCHED}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Mark episode 1 as not watched" }),
    ).toBeInTheDocument();
  });

  it("unmarks the episode when a watched episode is clicked again — a toggle, not a rewatch", async () => {
    const user = userEvent.setup();
    render(
      <EpisodeWatchControl
        showProviderId={1399}
        seasonNumber={1}
        episodeNumber={1}
        episodeProviderId={63056}
        summary={WATCHED}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Mark episode 1 as not watched" }));

    expect(unmarkEpisodeWatchedAction).toHaveBeenCalledWith({
      episodeProviderId: 63056,
      showProviderId: 1399,
      seasonNumber: 1,
    });
    expect(markEpisodeWatchedAction).not.toHaveBeenCalled();
  });

  it("never renders an Undo control", () => {
    render(
      <EpisodeWatchControl
        showProviderId={1399}
        seasonNumber={1}
        episodeNumber={1}
        episodeProviderId={63056}
        summary={WATCHED}
      />,
    );
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });
});
