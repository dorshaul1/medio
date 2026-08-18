import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LibraryNextEpisode, TrackedShowLibraryItem } from "@/server/library/types";
import { TrackedShowLibraryRow } from "./tracked-show-library-row";

vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: vi.fn().mockResolvedValue({}),
  startWatchingShowAction: vi.fn(),
}));
vi.mock("@/features/settings/settings-actions", () => ({
  updatePreferencesAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: vi.fn(),
  removePlanningItemAction: vi.fn(),
}));

const NEXT_EPISODE: LibraryNextEpisode = {
  seasonNumber: 2,
  episodeNumber: 4,
  episodeProviderId: 12345,
  title: "The Return",
};

const BASE_ITEM: TrackedShowLibraryItem = {
  mediaProviderId: 1399,
  mediaType: "show",
  kind: "tracked-show",
  title: "Game of Thrones",
  poster: null,
  year: 2011,
  personalActivityAt: new Date("2024-01-01"),
  addedAt: new Date("2024-01-01"),
  explicitState: "watching",
  derivedState: "watching",
  airedEpisodeCount: 10,
  watchedEpisodeCount: 4,
  nextEpisode: NEXT_EPISODE,
};

function renderRow(
  item: TrackedShowLibraryItem = BASE_ITEM,
  mobileEpisodeControls: "swipe" | "checkbox" | "swipe_checkbox" = "swipe",
) {
  return render(
    <ul>
      <TrackedShowLibraryRow
        item={item}
        mobileEpisodeControls={mobileEpisodeControls}
        hasSeenSwipeHint
      />
    </ul>,
  );
}

describe("TrackedShowLibraryRow", () => {
  it("always exposes the real accessible watch action, even in swipe-only mode", () => {
    renderRow(BASE_ITEM, "swipe");
    // A gesture-only visual presentation must never remove the real
    // control from the accessibility tree — see docs/library.md,
    // "Gesture accessibility".
    expect(
      screen.getByRole("button", { name: "Mark Game of Thrones S2 E4 watched" }),
    ).toBeInTheDocument();
  });

  it("visually hides the checkbox in swipe mode but keeps it screen-reader visible", () => {
    renderRow(BASE_ITEM, "swipe");
    const button = screen.getByRole("button", { name: "Mark Game of Thrones S2 E4 watched" });
    // The hiding class lives on a dedicated wrapper, not the button
    // itself — see tracked-show-library-row.tsx: `sr-only` merged onto
    // the button would fight its own `size-*` utility class for CSS
    // output order, an unreliable way to actually hide it.
    expect(button.parentElement?.className).toContain("sr-only");
  });

  it("keeps the checkbox fully visible in checkbox mode", () => {
    renderRow(BASE_ITEM, "checkbox");
    const button = screen.getByRole("button", { name: "Mark Game of Thrones S2 E4 watched" });
    expect(button.parentElement?.className).not.toContain("sr-only");
  });

  it("keeps the checkbox fully visible in swipe_checkbox mode too", () => {
    renderRow(BASE_ITEM, "swipe_checkbox");
    const button = screen.getByRole("button", { name: "Mark Game of Thrones S2 E4 watched" });
    expect(button.parentElement?.className).not.toContain("sr-only");
  });

  it("clicking the accessible control marks the exact next episode watched", async () => {
    const { markEpisodeWatchedAction } = await import("@/features/shows/show-tracking-actions");
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderRow(BASE_ITEM, "swipe");

    await user.click(screen.getByRole("button", { name: "Mark Game of Thrones S2 E4 watched" }));

    expect(markEpisodeWatchedAction).toHaveBeenCalledWith({
      showProviderId: 1399,
      seasonNumber: 2,
      episodeNumber: 4,
      episodeProviderId: 12345,
    });
  });

  it("offers no swipe/checkbox action for a show with no next episode known", () => {
    renderRow({ ...BASE_ITEM, nextEpisode: null });
    expect(screen.queryByRole("button", { name: /Mark/ })).not.toBeInTheDocument();
  });

  it("offers no swipe/checkbox action once caught up — nothing eligible to mark", () => {
    renderRow({ ...BASE_ITEM, derivedState: "caught_up", nextEpisode: null });
    expect(screen.queryByRole("button", { name: /Mark/ })).not.toBeInTheDocument();
  });

  it("renders the Resume action for an on-hold show, not a watch control", () => {
    renderRow({
      ...BASE_ITEM,
      explicitState: "on_hold",
      derivedState: "on_hold",
      nextEpisode: NEXT_EPISODE,
    });
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark/ })).not.toBeInTheDocument();
  });
});
