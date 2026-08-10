import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SeasonWatchControl } from "./season-watch-control";

const markSeasonWatchedAction = vi.fn();
const unmarkSeasonWatchedAction = vi.fn();
vi.mock("@/features/shows/show-tracking-actions", () => ({
  markSeasonWatchedAction: (...args: unknown[]) => markSeasonWatchedAction(...args),
  unmarkSeasonWatchedAction: (...args: unknown[]) => unmarkSeasonWatchedAction(...args),
}));

const AIRED_EPISODES = [
  { episodeNumber: 1, episodeProviderId: 9001 },
  { episodeNumber: 2, episodeProviderId: 9002 },
];

beforeEach(() => {
  markSeasonWatchedAction.mockReset().mockResolvedValue(undefined);
  unmarkSeasonWatchedAction.mockReset().mockResolvedValue(undefined);
});

describe("SeasonWatchControl", () => {
  it("renders nothing when the season has no aired episodes yet", () => {
    const { container } = render(
      <SeasonWatchControl
        showProviderId={1399}
        seasonNumber={1}
        airedEpisodes={[]}
        airedCount={0}
        watchedCount={0}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("offers Mark season watched while some aired episodes are still unwatched", () => {
    render(
      <SeasonWatchControl
        showProviderId={1399}
        seasonNumber={1}
        airedEpisodes={AIRED_EPISODES}
        airedCount={2}
        watchedCount={1}
      />,
    );
    expect(screen.getByRole("button", { name: "Mark season watched" })).toBeInTheDocument();
  });

  it("marks every aired episode watched immediately, with no confirmation", async () => {
    const user = userEvent.setup();
    render(
      <SeasonWatchControl
        showProviderId={1399}
        seasonNumber={1}
        airedEpisodes={AIRED_EPISODES}
        airedCount={2}
        watchedCount={0}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Mark season watched" }));

    expect(markSeasonWatchedAction).toHaveBeenCalledWith({
      showProviderId: 1399,
      seasonNumber: 1,
      episodes: AIRED_EPISODES,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a Season watched pill once every aired episode is watched", () => {
    render(
      <SeasonWatchControl
        showProviderId={1399}
        seasonNumber={1}
        airedEpisodes={AIRED_EPISODES}
        airedCount={2}
        watchedCount={2}
      />,
    );
    expect(screen.getByRole("button", { name: /Season watched/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark season watched" })).not.toBeInTheDocument();
  });

  it("unmarking the season requires confirming first — it deletes real history", async () => {
    const user = userEvent.setup();
    render(
      <SeasonWatchControl
        showProviderId={1399}
        seasonNumber={1}
        airedEpisodes={AIRED_EPISODES}
        airedCount={2}
        watchedCount={2}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Season watched/ }));
    expect(unmarkSeasonWatchedAction).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog", { name: "Mark season unwatched?" });
    await user.click(within(dialog).getByRole("button", { name: "Mark season unwatched" }));

    expect(unmarkSeasonWatchedAction).toHaveBeenCalledWith({
      showProviderId: 1399,
      seasonNumber: 1,
    });
  });

  it("cancelling the confirmation never calls the unmark action", async () => {
    const user = userEvent.setup();
    render(
      <SeasonWatchControl
        showProviderId={1399}
        seasonNumber={1}
        airedEpisodes={AIRED_EPISODES}
        airedCount={2}
        watchedCount={2}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Season watched/ }));
    const dialog = await screen.findByRole("dialog", { name: "Mark season unwatched?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(unmarkSeasonWatchedAction).not.toHaveBeenCalled();
  });
});
