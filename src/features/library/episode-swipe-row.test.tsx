import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EpisodeSwipeRow } from "./episode-swipe-row";
import { SWIPE_MAX_TRAVEL_PX } from "./swipe-math";

function drag(row: HTMLElement, dx: number, dy = 0) {
  fireEvent.pointerDown(row, { clientX: 0, clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(row, { clientX: dx, clientY: dy, pointerId: 1 });
}

describe("EpisodeSwipeRow", () => {
  it("follows the finger as it drags right, well short of committing", () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    render(
      <EpisodeSwipeRow onCommit={onCommit}>
        <span>Row content</span>
      </EpisodeSwipeRow>,
    );
    const row = screen.getByText("Row content").closest("div[style]") as HTMLElement;

    drag(row, 20);

    expect(row.style.transform).toBe("translateX(20px)");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("never follows a leftward drag — swipe right is the one committing direction", () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    render(
      <EpisodeSwipeRow onCommit={onCommit}>
        <span>Row content</span>
      </EpisodeSwipeRow>,
    );
    const row = screen.getByText("Row content").closest("div[style]") as HTMLElement;

    drag(row, -40);

    expect(row.style.transform).toBe("translateX(0px)");
  });

  it("treats a mostly-vertical drag as a scroll and never moves the row", () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    render(
      <EpisodeSwipeRow onCommit={onCommit}>
        <span>Row content</span>
      </EpisodeSwipeRow>,
    );
    const row = screen.getByText("Row content").closest("div[style]") as HTMLElement;

    drag(row, 10, 30);

    expect(row.style.transform).toBe("translateX(0px)");
  });

  it("releasing before the commit threshold snaps back and never commits", () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    render(
      <EpisodeSwipeRow onCommit={onCommit}>
        <span>Row content</span>
      </EpisodeSwipeRow>,
    );
    const row = screen.getByText("Row content").closest("div[style]") as HTMLElement;

    drag(row, SWIPE_MAX_TRAVEL_PX * 0.3);
    fireEvent.pointerUp(row, { clientX: SWIPE_MAX_TRAVEL_PX * 0.3, clientY: 0, pointerId: 1 });

    expect(row.style.transform).toBe("translateX(0px)");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("releasing past the commit threshold holds the reveal and commits", async () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    render(
      <EpisodeSwipeRow onCommit={onCommit}>
        <span>Row content</span>
      </EpisodeSwipeRow>,
    );
    const row = screen.getByText("Row content").closest("div[style]") as HTMLElement;

    const travel = SWIPE_MAX_TRAVEL_PX * 0.8;
    drag(row, travel);
    fireEvent.pointerUp(row, { clientX: travel, clientY: 0, pointerId: 1 });

    await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(1));
  });

  it("restores the row when the committed mutation fails — never leaves a false watched state", async () => {
    const onCommit = vi.fn().mockResolvedValue(false);
    render(
      <EpisodeSwipeRow onCommit={onCommit}>
        <span>Row content</span>
      </EpisodeSwipeRow>,
    );
    const row = screen.getByText("Row content").closest("div[style]") as HTMLElement;

    const travel = SWIPE_MAX_TRAVEL_PX * 0.8;
    drag(row, travel);
    fireEvent.pointerUp(row, { clientX: travel, clientY: 0, pointerId: 1 });

    await waitFor(() => expect(row.style.transform).toBe("translateX(0px)"));
  });

  it("ignores further drags while disabled — no repeated submission mid-mutation", () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    render(
      <EpisodeSwipeRow onCommit={onCommit} disabled>
        <span>Row content</span>
      </EpisodeSwipeRow>,
    );
    const row = screen.getByText("Row content").closest("div[style]") as HTMLElement;

    drag(row, 60);

    expect(row.style.transform).toBe("translateX(0px)");
  });
});
