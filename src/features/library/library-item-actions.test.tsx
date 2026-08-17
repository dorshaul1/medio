import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlannedMovieLibraryItem } from "@/server/library/types";
import { LibraryItemActions } from "./library-item-actions";

const changePlanningIntentAction = vi.fn();
const removePlanningItemAction = vi.fn();
vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: (...args: unknown[]) => changePlanningIntentAction(...args),
  removePlanningItemAction: (...args: unknown[]) => removePlanningItemAction(...args),
}));

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  changePlanningIntentAction.mockReset().mockResolvedValue(undefined);
  removePlanningItemAction.mockReset().mockResolvedValue(undefined);
});

// Typed as the specific member, not the full `LibraryItem` union —
// spreading a union-typed variable (`{ ...WATCHLIST_ITEM, intent:
// "backlog" }`) resolves to a union of intersections and confuses excess-
// property checking against members that don't have `intent` at all
// (`watched-movie`/`tracked-show`). This member type keeps the spread
// below unambiguous.
const WATCHLIST_ITEM: PlannedMovieLibraryItem = {
  kind: "planned-movie",
  mediaType: "movie",
  mediaProviderId: 550,
  title: "Fight Club",
  poster: null,
  year: 1999,
  intent: "watchlist",
  personalActivityAt: new Date(),
  addedAt: new Date(),
};

const BACKLOG_ITEM: PlannedMovieLibraryItem = { ...WATCHLIST_ITEM, intent: "backlog" };

describe("LibraryItemActions", () => {
  it("offers moving a Watchlist item to Backlog", async () => {
    const user = userEvent.setup();
    render(<LibraryItemActions item={WATCHLIST_ITEM} />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    await user.click(await screen.findByRole("menuitem", { name: "Move to Backlog" }));

    expect(changePlanningIntentAction).toHaveBeenCalledWith("movie", 550, "backlog");
  });

  it("offers moving a Backlog item to Watchlist", async () => {
    const user = userEvent.setup();
    render(<LibraryItemActions item={BACKLOG_ITEM} />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    await user.click(await screen.findByRole("menuitem", { name: "Move to Watchlist" }));

    expect(changePlanningIntentAction).toHaveBeenCalledWith("movie", 550, "watchlist");
  });

  it("removes the planning item, with the list it's being removed from named explicitly", async () => {
    const user = userEvent.setup();
    render(<LibraryItemActions item={WATCHLIST_ITEM} />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove from Watchlist" }));

    expect(removePlanningItemAction).toHaveBeenCalledWith("movie", 550);
  });

  it("names Backlog specifically when removing a Backlog item", async () => {
    const user = userEvent.setup();
    render(<LibraryItemActions item={BACKLOG_ITEM} />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    expect(
      await screen.findByRole("menuitem", { name: "Remove from Backlog" }),
    ).toBeInTheDocument();
  });

  it("renders nothing for a watched movie", () => {
    const { container } = render(
      <LibraryItemActions
        item={{
          kind: "watched-movie",
          mediaType: "movie",
          mediaProviderId: 550,
          title: "Fight Club",
          poster: null,
          year: 1999,
          watchCount: 1,
          lastWatchedAt: new Date(),
          personalActivityAt: new Date(),
          addedAt: new Date(),
        }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
