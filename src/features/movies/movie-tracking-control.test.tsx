import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MovieWatchEvent, MovieWatchSummary } from "@/server/tracking/types";
import { MovieTrackingControl } from "./movie-tracking-control";

const markMovieWatchedAction = vi.fn();
const removeMovieWatchEventAction = vi.fn();
vi.mock("./movie-tracking-actions", () => ({
  markMovieWatchedAction: (...args: unknown[]) => markMovieWatchedAction(...args),
  removeMovieWatchEventAction: (...args: unknown[]) => removeMovieWatchEventAction(...args),
}));

const UNWATCHED: MovieWatchSummary = { hasWatched: false, watchCount: 0, lastWatchedAt: null };

// jsdom doesn't implement these — Radix's Popover/Select use them for
// pointer-based open/close and scroll-into-view behavior. See
// features/shows/season-select.test.tsx for the same stub.
function stubPointerCapture() {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

describe("MovieTrackingControl", () => {
  it("shows Mark watched for a never-watched movie", () => {
    render(
      <MovieTrackingControl movieProviderId={550} summary={UNWATCHED} events={[]} hasReleased />,
    );
    expect(screen.getByRole("button", { name: "Mark watched" })).toBeInTheDocument();
  });

  it("calls the mark-watched action with no explicit date on primary click", async () => {
    markMovieWatchedAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MovieTrackingControl movieProviderId={550} summary={UNWATCHED} events={[]} hasReleased />,
    );

    await user.click(screen.getByRole("button", { name: "Mark watched" }));

    expect(markMovieWatchedAction).toHaveBeenCalledWith(550);
  });

  it("never shows Watched before the server action actually resolves — watch history can't be optimistic", async () => {
    // Never resolves during this test — proves the UI waits for the real
    // mutation rather than assuming success (see the component's own
    // comment on why this control is deliberately not optimistic: a fast
    // reload right after an optimistic update could lose the event
    // entirely, since the in-flight request doesn't survive navigation).
    markMovieWatchedAction.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(
      <MovieTrackingControl movieProviderId={550} summary={UNWATCHED} events={[]} hasReleased />,
    );

    await user.click(screen.getByRole("button", { name: "Mark watched" }));

    expect(screen.queryByRole("button", { name: /^Watched$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark watched" })).toBeDisabled();
  });

  it("shows a singular watched label for one viewing", () => {
    const summary: MovieWatchSummary = {
      hasWatched: true,
      watchCount: 1,
      lastWatchedAt: new Date("2024-01-01"),
    };
    render(
      <MovieTrackingControl movieProviderId={550} summary={summary} events={[]} hasReleased />,
    );
    expect(screen.getByRole("button", { name: /^Watched$/ })).toBeInTheDocument();
  });

  it("shows a rewatch count for multiple viewings", () => {
    const summary: MovieWatchSummary = {
      hasWatched: true,
      watchCount: 3,
      lastWatchedAt: new Date("2024-01-01"),
    };
    render(
      <MovieTrackingControl movieProviderId={550} summary={summary} events={[]} hasReleased />,
    );
    expect(screen.getByRole("button", { name: /Watched 3 times/ })).toBeInTheDocument();
  });

  it("records another watch via Watch again — a rewatch, not a toggle", async () => {
    stubPointerCapture();
    markMovieWatchedAction.mockResolvedValue(undefined);
    const summary: MovieWatchSummary = {
      hasWatched: true,
      watchCount: 1,
      lastWatchedAt: new Date("2024-01-01"),
    };
    const user = userEvent.setup();
    render(
      <MovieTrackingControl movieProviderId={550} summary={summary} events={[]} hasReleased />,
    );

    await user.click(screen.getByRole("button", { name: /^Watched$/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Watch again" }));

    expect(markMovieWatchedAction).toHaveBeenCalledWith(550);
  });

  it("removes exactly the selected event from history, not the whole watched state", async () => {
    stubPointerCapture();
    removeMovieWatchEventAction.mockResolvedValue(undefined);
    // Local-component construction (not an ISO string parsed as UTC) so the
    // rendered calendar date is deterministic regardless of the test
    // runner's timezone.
    const summary: MovieWatchSummary = {
      hasWatched: true,
      watchCount: 2,
      lastWatchedAt: new Date(2024, 5, 1, 20, 0),
    };
    const events: MovieWatchEvent[] = [
      {
        id: "event-1",
        movieProviderId: 550,
        watchedAt: new Date(2024, 0, 1, 20, 0),
        createdAt: new Date(),
      },
      {
        id: "event-2",
        movieProviderId: 550,
        watchedAt: new Date(2024, 5, 1, 20, 0),
        createdAt: new Date(),
      },
    ];
    const user = userEvent.setup();
    render(
      <MovieTrackingControl movieProviderId={550} summary={summary} events={events} hasReleased />,
    );

    await user.click(screen.getByRole("button", { name: /Watched 2 times/ }));
    await user.click(await screen.findByRole("menuitem", { name: /Remove Jan 1, 2024/ }));

    expect(removeMovieWatchEventAction).toHaveBeenCalledWith("event-1", 550);
  });

  it("distinguishes two same-day rewatches by time, so Remove never targets the wrong one", async () => {
    stubPointerCapture();
    const events: MovieWatchEvent[] = [
      {
        id: "event-1",
        movieProviderId: 550,
        watchedAt: new Date(2024, 5, 1, 14, 30),
        createdAt: new Date(),
      },
      {
        id: "event-2",
        movieProviderId: 550,
        watchedAt: new Date(2024, 5, 1, 21, 15),
        createdAt: new Date(),
      },
    ];
    const summary: MovieWatchSummary = {
      hasWatched: true,
      watchCount: 2,
      lastWatchedAt: new Date(2024, 5, 1, 21, 15),
    };
    const user = userEvent.setup();
    render(
      <MovieTrackingControl movieProviderId={550} summary={summary} events={events} hasReleased />,
    );

    await user.click(screen.getByRole("button", { name: /Watched 2 times/ }));

    const first = await screen.findByRole("menuitem", { name: /Remove Jun 1, 2024, 2:30/ });
    const second = screen.getByRole("menuitem", { name: /Remove Jun 1, 2024, 9:15/ });
    expect(first).toBeInTheDocument();
    expect(second).toBeInTheDocument();
  });

  it("shows the last-watched date once watched", () => {
    const summary: MovieWatchSummary = {
      hasWatched: true,
      watchCount: 1,
      lastWatchedAt: new Date("2024-08-07"),
    };
    render(
      <MovieTrackingControl movieProviderId={550} summary={summary} events={[]} hasReleased />,
    );
    expect(screen.getByText(/Last watched Aug 7, 2024/)).toBeInTheDocument();
  });

  it("offers marking watched on another date via a secondary control", () => {
    render(
      <MovieTrackingControl movieProviderId={550} summary={UNWATCHED} events={[]} hasReleased />,
    );
    expect(
      screen.getByRole("button", { name: "Mark watched on another date" }),
    ).toBeInTheDocument();
  });

  it("shows Not yet released instead of Mark watched for an unreleased movie", () => {
    render(
      <MovieTrackingControl
        movieProviderId={550}
        summary={UNWATCHED}
        events={[]}
        hasReleased={false}
      />,
    );
    expect(screen.getByText("Not yet released")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark watched" })).not.toBeInTheDocument();
  });

  it("real watch history still takes priority even if the release date looks unreleased", () => {
    const summary: MovieWatchSummary = {
      hasWatched: true,
      watchCount: 1,
      lastWatchedAt: new Date("2024-01-01"),
    };
    render(
      <MovieTrackingControl
        movieProviderId={550}
        summary={summary}
        events={[]}
        hasReleased={false}
      />,
    );
    expect(screen.getByRole("button", { name: /^Watched$/ })).toBeInTheDocument();
    expect(screen.queryByText("Not yet released")).not.toBeInTheDocument();
  });
});
