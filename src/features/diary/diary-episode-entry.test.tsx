import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EpisodeDiaryEntry } from "@/server/diary/types";
import { DiaryEpisodeEntry } from "./diary-episode-entry";

vi.mock("@/features/movies/movie-tracking-actions", () => ({
  removeMovieWatchEventAction: vi.fn(),
  updateMovieWatchedAtAction: vi.fn(),
}));
vi.mock("@/features/shows/show-tracking-actions", () => ({
  removeEpisodeWatchEventAction: vi.fn(),
  updateEpisodeWatchedAtAction: vi.fn(),
}));

function entry(overrides: Partial<EpisodeDiaryEntry> = {}): EpisodeDiaryEntry {
  return {
    kind: "episode",
    id: "event-1",
    watchedAt: new Date(2024, 0, 5),
    ordinal: 1,
    showProviderId: 1399,
    seasonNumber: 1,
    episodeNumber: 1,
    episodeProviderId: 63056,
    showTitle: "Winter's Watch",
    episodeTitle: "Winter Is Coming",
    showPoster: null,
    episodeStill: null,
    ...overrides,
  };
}

describe("DiaryEpisodeEntry", () => {
  it("identifies both the show and the specific episode", () => {
    render(
      <ul>
        <DiaryEpisodeEntry entry={entry()} />
      </ul>,
    );

    expect(screen.getByText("Winter's Watch")).toBeInTheDocument();
    expect(screen.getByText("S1 E1 · Winter Is Coming")).toBeInTheDocument();
  });

  it("links directly to the episode within its season", () => {
    render(
      <ul>
        <DiaryEpisodeEntry entry={entry()} />
      </ul>,
    );

    const link = screen.getByRole("link", { name: /Winter Is Coming/ });
    expect(link).toHaveAttribute("href", "/shows/1399/seasons/1#episode-1");
  });

  it("shows no rewatch label for a first viewing", () => {
    render(
      <ul>
        <DiaryEpisodeEntry entry={entry({ ordinal: 1 })} />
      </ul>,
    );

    expect(screen.queryByText(/watch$/)).not.toBeInTheDocument();
  });

  it("shows an ordinal rewatch label from the 2nd viewing onward", () => {
    render(
      <ul>
        <DiaryEpisodeEntry entry={entry({ ordinal: 2 })} />
      </ul>,
    );

    expect(screen.getByText("2nd watch")).toBeInTheDocument();
  });

  it("offers a contextual menu naming the show and episode coordinate", () => {
    render(
      <ul>
        <DiaryEpisodeEntry entry={entry()} />
      </ul>,
    );

    expect(
      screen.getByRole("button", { name: "More actions for Winter's Watch, S1 E1" }),
    ).toBeInTheDocument();
  });
});
