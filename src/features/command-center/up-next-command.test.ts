import { describe, expect, it, vi } from "vitest";
import { buildUpNextCommand } from "./up-next-command";

const markEpisodeWatchedAction = vi.fn();
vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: (...args: unknown[]) => markEpisodeWatchedAction(...args),
}));

const UP_NEXT = {
  showProviderId: 1399,
  title: "Severance",
  poster: null,
  backdrop: null,
  year: 2022,
  lastActivityAt: new Date(),
  airedEpisodeCount: 20,
  watchedEpisodeCount: 5,
  remainingAiredEpisodeCount: 15,
  nextEpisode: {
    seasonNumber: 2,
    episodeNumber: 6,
    episodeProviderId: 9999,
    title: "Chikhai Bardo",
    runtimeMinutes: 55,
  },
};

describe("buildUpNextCommand", () => {
  it("labels itself with the exact show/episode identity", () => {
    const command = buildUpNextCommand(UP_NEXT, vi.fn());
    expect(command.label).toBe("Mark Severance S2 E6 watched");
  });

  it("marks watched through the same canonical mutation every episode control uses", async () => {
    markEpisodeWatchedAction.mockResolvedValue(undefined);
    const onDone = vi.fn();
    const command = buildUpNextCommand(UP_NEXT, onDone);

    if (!("run" in command)) throw new Error("expected an action command");
    await command.run({ router: { push: vi.fn() }, openLogWatched: vi.fn(), close: vi.fn() });

    expect(markEpisodeWatchedAction).toHaveBeenCalledWith({
      showProviderId: 1399,
      seasonNumber: 2,
      episodeNumber: 6,
      episodeProviderId: 9999,
    });
    expect(onDone).toHaveBeenCalled();
  });
});
