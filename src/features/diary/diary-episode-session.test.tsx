import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EpisodeDiaryEntry } from "@/server/diary/types";
import { DiaryEpisodeSession } from "./diary-episode-session";

vi.mock("@/features/movies/movie-tracking-actions", () => ({
  removeMovieWatchEventAction: vi.fn(),
  updateMovieWatchedAtAction: vi.fn(),
}));
vi.mock("@/features/shows/show-tracking-actions", () => ({
  removeEpisodeWatchEventAction: vi.fn(),
  updateEpisodeWatchedAtAction: vi.fn(),
}));

function episode(overrides: Partial<EpisodeDiaryEntry> & { id: string }): EpisodeDiaryEntry {
  return {
    kind: "episode",
    watchedAt: new Date(2026, 7, 10, 20, 0),
    ordinal: 1,
    showProviderId: 1404,
    seasonNumber: 2,
    episodeNumber: 4,
    episodeProviderId: 9000,
    showTitle: "Eighth Watch",
    episodeTitle: "Episode",
    showPoster: null,
    episodeStill: null,
    ...overrides,
  };
}

const SESSION = [
  episode({
    id: "e1",
    episodeNumber: 4,
    episodeTitle: "Chapter Four",
    watchedAt: new Date(2026, 7, 10, 20, 0),
  }),
  episode({
    id: "e2",
    episodeNumber: 5,
    episodeTitle: "Chapter Five",
    watchedAt: new Date(2026, 7, 10, 20, 45),
  }),
  episode({
    id: "e3",
    episodeNumber: 6,
    episodeTitle: "Chapter Six",
    watchedAt: new Date(2026, 7, 10, 21, 30),
  }),
];

describe("DiaryEpisodeSession", () => {
  it("shows the show title and a compact range summary, collapsed by default", () => {
    render(
      <ul>
        <DiaryEpisodeSession entries={SESSION} />
      </ul>,
    );

    expect(screen.getByText("Eighth Watch")).toBeInTheDocument();
    expect(screen.getByText("S2 E4-E6 · 3 episodes")).toBeInTheDocument();
    expect(screen.queryByText("Chapter Four")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Eighth Watch/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("expands to reveal every individual episode row, each still independently linkable", async () => {
    const user = userEvent.setup();
    render(
      <ul>
        <DiaryEpisodeSession entries={SESSION} />
      </ul>,
    );

    await user.click(screen.getByRole("button", { name: /Eighth Watch/ }));

    expect(screen.getByText("S2 E4 · Chapter Four")).toBeInTheDocument();
    expect(screen.getByText("S2 E5 · Chapter Five")).toBeInTheDocument();
    expect(screen.getByText("S2 E6 · Chapter Six")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Chapter Five/ });
    expect(link).toHaveAttribute("href", "/shows/1404/seasons/2#episode-5");
  });

  it("collapses again on a second toggle", async () => {
    const user = userEvent.setup();
    render(
      <ul>
        <DiaryEpisodeSession entries={SESSION} />
      </ul>,
    );

    const toggle = screen.getByRole("button", { name: /Eighth Watch/ });
    await user.click(toggle);
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Chapter Four")).not.toBeInTheDocument();
  });
});
