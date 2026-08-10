import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiaryEntryMenu } from "./diary-entry-menu";

const removeMovieWatchEventAction = vi.fn();
const updateMovieWatchedAtAction = vi.fn();
vi.mock("@/features/movies/movie-tracking-actions", () => ({
  removeMovieWatchEventAction: (...args: unknown[]) => removeMovieWatchEventAction(...args),
  updateMovieWatchedAtAction: (...args: unknown[]) => updateMovieWatchedAtAction(...args),
}));

const removeEpisodeWatchEventAction = vi.fn();
const updateEpisodeWatchedAtAction = vi.fn();
vi.mock("@/features/shows/show-tracking-actions", () => ({
  removeEpisodeWatchEventAction: (...args: unknown[]) => removeEpisodeWatchEventAction(...args),
  updateEpisodeWatchedAtAction: (...args: unknown[]) => updateEpisodeWatchedAtAction(...args),
}));

beforeEach(() => {
  removeMovieWatchEventAction.mockReset();
  updateMovieWatchedAtAction.mockReset();
  removeEpisodeWatchEventAction.mockReset();
  updateEpisodeWatchedAtAction.mockReset();
});

const MOVIE_TARGET = {
  eventType: "movie" as const,
  id: "event-1",
  movieProviderId: 550,
  watchedAt: new Date(2024, 0, 5, 20, 30),
};

const EPISODE_TARGET = {
  eventType: "episode" as const,
  id: "event-2",
  showProviderId: 1399,
  seasonNumber: 1,
  watchedAt: new Date(2024, 0, 5, 20, 30),
};

describe("DiaryEntryMenu", () => {
  it("offers Edit watch date and Delete for a movie entry", async () => {
    const user = userEvent.setup();
    render(<DiaryEntryMenu target={MOVIE_TARGET} accessibleName="Fight Club" />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));

    expect(screen.getByRole("menuitem", { name: "Edit watch date" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("deleting a movie entry requires confirming first", async () => {
    const user = userEvent.setup();
    render(<DiaryEntryMenu target={MOVIE_TARGET} accessibleName="Fight Club" />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(removeMovieWatchEventAction).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog", { name: "Delete this entry?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(removeMovieWatchEventAction).toHaveBeenCalledWith("event-1", 550);
  });

  it("cancelling the delete confirmation never calls the action", async () => {
    const user = userEvent.setup();
    render(<DiaryEntryMenu target={MOVIE_TARGET} accessibleName="Fight Club" />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this entry?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(removeMovieWatchEventAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deleting an episode entry calls the episode action with show/season identity", async () => {
    const user = userEvent.setup();
    render(<DiaryEntryMenu target={EPISODE_TARGET} accessibleName="Winter's Watch, S1 E1" />);

    await user.click(screen.getByRole("button", { name: /More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this entry?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(removeEpisodeWatchEventAction).toHaveBeenCalledWith({
      eventId: "event-2",
      showProviderId: 1399,
      seasonNumber: 1,
    });
  });

  it("editing the watch date opens pre-filled to the current date", async () => {
    const user = userEvent.setup();
    render(<DiaryEntryMenu target={MOVIE_TARGET} accessibleName="Fight Club" />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit watch date" }));

    expect(await screen.findByLabelText("Watched on")).toHaveValue("2024-01-05");
  });

  it("saving a corrected date calls the movie action, preserving the original time of day", async () => {
    const user = userEvent.setup();
    render(<DiaryEntryMenu target={MOVIE_TARGET} accessibleName="Fight Club" />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit watch date" }));
    const input = await screen.findByLabelText("Watched on");
    await user.clear(input);
    await user.type(input, "2024-06-15");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateMovieWatchedAtAction).toHaveBeenCalledTimes(1);
    const call = updateMovieWatchedAtAction.mock.calls[0];
    if (!call) throw new Error("expected updateMovieWatchedAtAction to have been called");
    const [eventId, movieProviderId, watchedAt] = call;
    expect(eventId).toBe("event-1");
    expect(movieProviderId).toBe(550);
    expect(watchedAt.getFullYear()).toBe(2024);
    expect(watchedAt.getMonth()).toBe(5);
    expect(watchedAt.getDate()).toBe(15);
    // The original 20:30 time of day is preserved, not reset.
    expect(watchedAt.getHours()).toBe(20);
    expect(watchedAt.getMinutes()).toBe(30);
  });

  it("saving a corrected date for an episode calls the episode action", async () => {
    const user = userEvent.setup();
    render(<DiaryEntryMenu target={EPISODE_TARGET} accessibleName="Winter's Watch, S1 E1" />);

    await user.click(screen.getByRole("button", { name: /More actions/ }));
    await user.click(screen.getByRole("menuitem", { name: "Edit watch date" }));
    const input = await screen.findByLabelText("Watched on");
    await user.clear(input);
    await user.type(input, "2024-06-15");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateEpisodeWatchedAtAction).toHaveBeenCalledTimes(1);
    const invocation = updateEpisodeWatchedAtAction.mock.calls[0];
    if (!invocation) throw new Error("expected updateEpisodeWatchedAtAction to have been called");
    const [call] = invocation;
    expect(call.eventId).toBe("event-2");
    expect(call.showProviderId).toBe(1399);
    expect(call.seasonNumber).toBe(1);
    expect(call.watchedAt.getDate()).toBe(15);
  });

  it("cancelling the edit dialog never calls the action", async () => {
    const user = userEvent.setup();
    render(<DiaryEntryMenu target={MOVIE_TARGET} accessibleName="Fight Club" />);

    await user.click(screen.getByRole("button", { name: "More actions for Fight Club" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit watch date" }));
    await screen.findByLabelText("Watched on");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateMovieWatchedAtAction).not.toHaveBeenCalled();
  });
});
