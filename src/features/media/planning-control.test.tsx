import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningControl } from "./planning-control";

const changePlanningIntentAction = vi.fn();
const removePlanningItemAction = vi.fn();
vi.mock("./planning-actions", () => ({
  changePlanningIntentAction: (...args: unknown[]) => changePlanningIntentAction(...args),
  removePlanningItemAction: (...args: unknown[]) => removePlanningItemAction(...args),
}));

// jsdom doesn't implement these — Radix's DropdownMenu uses them for
// pointer-based open/close behavior. See features/shows/season-select.test.tsx.
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  changePlanningIntentAction.mockReset().mockResolvedValue(undefined);
  removePlanningItemAction.mockReset().mockResolvedValue(undefined);
});

describe("PlanningControl", () => {
  it("shows a bare icon trigger, with a precise accessible name, when nothing is planned yet", () => {
    render(
      <PlanningControl
        mediaType="movie"
        mediaProviderId={550}
        intent={null}
        title="Fight Club"
        defaultIntent="watchlist"
      />,
    );
    const trigger = screen.getByRole("button", { name: "Save Fight Club to Watchlist" });
    expect(trigger).toBeInTheDocument();
    // Not a dropdown trigger — no aria-haspopup — clicking it must save
    // directly, never open a menu first.
    expect(trigger).not.toHaveAttribute("aria-haspopup");
  });

  it("saves straight to Watchlist in one click — no menu for the common path", async () => {
    const user = userEvent.setup();
    render(
      <PlanningControl
        mediaType="movie"
        mediaProviderId={550}
        intent={null}
        title="Fight Club"
        defaultIntent="watchlist"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save Fight Club to Watchlist" }));

    expect(changePlanningIntentAction).toHaveBeenCalledWith("movie", 550, "watchlist");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("reflects the current intent as a visible label on the trigger", () => {
    render(
      <PlanningControl
        mediaType="movie"
        mediaProviderId={550}
        intent="watchlist"
        title="Fight Club"
        defaultIntent="watchlist"
      />,
    );
    expect(screen.getByRole("button", { name: "Watchlist" })).toBeInTheDocument();
  });

  it("switches from Watchlist to Backlog by clicking the current save state", async () => {
    const user = userEvent.setup();
    render(
      <PlanningControl
        mediaType="movie"
        mediaProviderId={550}
        intent="watchlist"
        title="Fight Club"
        defaultIntent="watchlist"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Watchlist" }));
    await user.click(await screen.findByRole("menuitem", { name: /Move to Backlog/ }));

    expect(changePlanningIntentAction).toHaveBeenCalledWith("movie", 550, "backlog");
  });

  it("switches from Backlog to Watchlist the same way", async () => {
    const user = userEvent.setup();
    render(
      <PlanningControl
        mediaType="show"
        mediaProviderId={1399}
        intent="backlog"
        title="Winter's Watch"
        defaultIntent="watchlist"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Backlog" }));
    await user.click(await screen.findByRole("menuitem", { name: /Move to Watchlist/ }));

    expect(changePlanningIntentAction).toHaveBeenCalledWith("show", 1399, "watchlist");
  });

  it("offers Remove, naming the list it removes from, once something is planned", async () => {
    const user = userEvent.setup();
    render(
      <PlanningControl
        mediaType="movie"
        mediaProviderId={550}
        intent="backlog"
        title="Fight Club"
        defaultIntent="watchlist"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Backlog" }));
    const removeItem = await screen.findByRole("menuitem", { name: "Remove from Backlog" });
    await user.click(removeItem);

    expect(removePlanningItemAction).toHaveBeenCalledWith("movie", 550);
  });

  it("saves to the preferred default destination — Backlog when that's the preference", async () => {
    const user = userEvent.setup();
    render(
      <PlanningControl
        mediaType="movie"
        mediaProviderId={550}
        intent={null}
        title="Fight Club"
        defaultIntent="backlog"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Save Fight Club to Backlog" });
    await user.click(trigger);

    expect(changePlanningIntentAction).toHaveBeenCalledWith("movie", 550, "backlog");
  });

  it("does not offer Remove when nothing is planned yet", () => {
    render(
      <PlanningControl
        mediaType="movie"
        mediaProviderId={550}
        intent={null}
        title="Fight Club"
        defaultIntent="watchlist"
      />,
    );
    expect(screen.queryByRole("menuitem", { name: /Remove/ })).not.toBeInTheDocument();
  });
});
