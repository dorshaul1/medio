import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarkShowWatchedControl } from "./mark-show-watched-control";

const markShowWatchedAction = vi.fn();
vi.mock("@/features/shows/show-tracking-actions", () => ({
  markShowWatchedAction: (...args: unknown[]) => markShowWatchedAction(...args),
}));

const EPISODES = [
  { seasonNumber: 1, episodeNumber: 1, episodeProviderId: 9001 },
  { seasonNumber: 2, episodeNumber: 1, episodeProviderId: 9002 },
];

beforeEach(() => {
  markShowWatchedAction.mockReset().mockResolvedValue(undefined);
});

describe("MarkShowWatchedControl", () => {
  it("renders nothing once nothing remains to catch up on", () => {
    const { container } = render(
      <MarkShowWatchedControl showProviderId={1399} episodes={EPISODES} remainingCount={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("offers Mark all watched while episodes remain", () => {
    render(<MarkShowWatchedControl showProviderId={1399} episodes={EPISODES} remainingCount={2} />);
    expect(screen.getByRole("button", { name: "Mark all watched" })).toBeInTheDocument();
  });

  it("marks every given episode watched immediately, with no confirmation", async () => {
    const user = userEvent.setup();
    render(<MarkShowWatchedControl showProviderId={1399} episodes={EPISODES} remainingCount={2} />);

    await user.click(screen.getByRole("button", { name: "Mark all watched" }));

    expect(markShowWatchedAction).toHaveBeenCalledWith({
      showProviderId: 1399,
      episodes: EPISODES,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
