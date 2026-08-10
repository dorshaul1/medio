import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShowProgress } from "@/server/tracking/types";
import { ShowTrackingControl } from "./show-tracking-control";

const startWatchingShowAction = vi.fn();
const putShowOnHoldAction = vi.fn();
const dropShowAction = vi.fn();
const clearShowTrackingStateAction = vi.fn();
const resetShowProgressAction = vi.fn();
vi.mock("./show-tracking-actions", () => ({
  startWatchingShowAction: (...args: unknown[]) => startWatchingShowAction(...args),
  putShowOnHoldAction: (...args: unknown[]) => putShowOnHoldAction(...args),
  dropShowAction: (...args: unknown[]) => dropShowAction(...args),
  clearShowTrackingStateAction: (...args: unknown[]) => clearShowTrackingStateAction(...args),
  resetShowProgressAction: (...args: unknown[]) => resetShowProgressAction(...args),
}));

// jsdom doesn't implement these — Radix's DropdownMenu uses them for
// pointer-based open/close behavior.
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  [
    startWatchingShowAction,
    putShowOnHoldAction,
    dropShowAction,
    clearShowTrackingStateAction,
    resetShowProgressAction,
  ].forEach((fn) => {
    fn.mockReset();
    fn.mockResolvedValue(undefined);
  });
});

function progress(overrides: Partial<ShowProgress>): ShowProgress {
  return {
    airedEpisodeCount: 10,
    uniqueWatchedAiredEpisodeCount: 0,
    remainingAiredEpisodeCount: 10,
    completionRatio: 0,
    lastWatchedEpisode: null,
    lastWatchedAt: null,
    nextUnwatchedEpisode: null,
    derivedViewingState: "unwatched",
    ...overrides,
  };
}

describe("ShowTrackingControl", () => {
  it("shows Start watching when there's no explicit state and no history", () => {
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState={null}
        progress={progress({ derivedViewingState: "unwatched" })}
      />,
    );
    expect(screen.getByRole("button", { name: "Start watching" })).toBeInTheDocument();
  });

  it("calls startWatchingShowAction from Start watching", async () => {
    const user = userEvent.setup();
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState={null}
        progress={progress({ derivedViewingState: "unwatched" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start watching" }));
    expect(startWatchingShowAction).toHaveBeenCalledWith(1399);
  });

  it("shows Watching with progress once episodes are watched", () => {
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState="watching"
        progress={progress({ uniqueWatchedAiredEpisodeCount: 4, derivedViewingState: "watching" })}
      />,
    );
    expect(screen.getByText("Watching")).toBeInTheDocument();
    expect(screen.getByText("4 of 10 episodes")).toBeInTheDocument();
  });

  it("shows Caught up as a distinct personal-status label", () => {
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState="watching"
        progress={progress({
          uniqueWatchedAiredEpisodeCount: 10,
          derivedViewingState: "caught_up",
        })}
      />,
    );
    expect(screen.getByText("Caught up")).toBeInTheDocument();
  });

  it("offers On hold and Dropped from the tracking menu", async () => {
    const user = userEvent.setup();
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState="watching"
        progress={progress({ derivedViewingState: "watching" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tracking options" }));
    await user.click(await screen.findByRole("menuitem", { name: "On hold" }));

    expect(putShowOnHoldAction).toHaveBeenCalledWith(1399);
  });

  it("offers Resume watching when on hold", async () => {
    const user = userEvent.setup();
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState="on_hold"
        progress={progress({ derivedViewingState: "on_hold" })}
      />,
    );

    expect(screen.getByText("On hold")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tracking options" }));
    await user.click(await screen.findByRole("menuitem", { name: "Resume watching" }));

    expect(startWatchingShowAction).toHaveBeenCalledWith(1399);
  });

  it("offers Reset progress only once the show has watched episodes", async () => {
    const user = userEvent.setup();
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState="watching"
        progress={progress({ derivedViewingState: "watching" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tracking options" }));
    expect(screen.queryByRole("menuitem", { name: "Reset progress" })).not.toBeInTheDocument();
  });

  it("resets progress only after confirming — a genuinely destructive action", async () => {
    const user = userEvent.setup();
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState="watching"
        progress={progress({ uniqueWatchedAiredEpisodeCount: 4, derivedViewingState: "watching" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tracking options" }));
    await user.click(await screen.findByRole("menuitem", { name: "Reset progress" }));

    // The dropdown item alone must not have called the action yet.
    expect(resetShowProgressAction).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog", { name: "Reset progress?" });
    await user.click(within(dialog).getByRole("button", { name: "Reset progress" }));

    expect(resetShowProgressAction).toHaveBeenCalledWith(1399);
  });

  it("cancelling the confirmation never calls the reset action", async () => {
    const user = userEvent.setup();
    render(
      <ShowTrackingControl
        showProviderId={1399}
        explicitState="watching"
        progress={progress({ uniqueWatchedAiredEpisodeCount: 4, derivedViewingState: "watching" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tracking options" }));
    await user.click(await screen.findByRole("menuitem", { name: "Reset progress" }));
    const dialog = await screen.findByRole("dialog", { name: "Reset progress?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(resetShowProgressAction).not.toHaveBeenCalled();
  });
});
