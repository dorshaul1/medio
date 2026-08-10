import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpNextMarkWatchedButton } from "./up-next-mark-watched-button";

const markEpisodeWatchedAction = vi.fn();
vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: (...args: unknown[]) => markEpisodeWatchedAction(...args),
}));

function renderButton() {
  return render(
    <UpNextMarkWatchedButton
      showProviderId={1396}
      seasonNumber={1}
      episodeNumber={4}
      episodeProviderId={999}
    />,
  );
}

describe("UpNextMarkWatchedButton", () => {
  beforeEach(() => {
    markEpisodeWatchedAction.mockReset().mockResolvedValue({ id: "evt-1" });
  });

  it("marks the episode watched via the shared episode action — the same toggle every episode control uses", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Mark watched" }));

    expect(markEpisodeWatchedAction).toHaveBeenCalledWith({
      showProviderId: 1396,
      seasonNumber: 1,
      episodeNumber: 4,
      episodeProviderId: 999,
    });
  });

  it("shows no Undo control — episode tracking is a plain toggle, never a confirmation", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Mark watched" }));

    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("shows a Watched status flash while the revalidation is in flight — the checkmark alone, no visible label", async () => {
    let resolveAction: (() => void) | undefined;
    markEpisodeWatchedAction.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveAction = resolve;
      }),
    );
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Mark watched" }));

    expect(await screen.findByRole("status", { name: "Watched" })).toBeInTheDocument();
    resolveAction?.();
  });
});
