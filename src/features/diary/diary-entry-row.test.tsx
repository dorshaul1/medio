import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DiaryEntry } from "@/server/diary/types";
import { DiaryEntryRow } from "./diary-entry-row";

vi.mock("@/features/movies/movie-tracking-actions", () => ({
  removeMovieWatchEventAction: vi.fn(),
  updateMovieWatchedAtAction: vi.fn(),
}));
vi.mock("@/features/shows/show-tracking-actions", () => ({
  removeEpisodeWatchEventAction: vi.fn(),
  updateEpisodeWatchedAtAction: vi.fn(),
}));

describe("DiaryEntryRow", () => {
  it("dispatches a movie entry to the movie row", () => {
    const entry: DiaryEntry = {
      kind: "movie",
      id: "a",
      watchedAt: new Date(2024, 0, 5),
      ordinal: 1,
      movieProviderId: 550,
      title: "Fight Club",
      year: 1999,
      poster: null,
    };
    render(
      <ul>
        <DiaryEntryRow entry={entry} />
      </ul>,
    );
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
  });

  it("dispatches an episode entry to the episode row", () => {
    const entry: DiaryEntry = {
      kind: "episode",
      id: "b",
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
    };
    render(
      <ul>
        <DiaryEntryRow entry={entry} />
      </ul>,
    );
    expect(screen.getByText("Winter's Watch")).toBeInTheDocument();
  });

  it("renders an unavailable movie entry without fabricating a title, still linking to the real id", () => {
    const entry: DiaryEntry = {
      kind: "unavailable",
      eventType: "movie",
      id: "c",
      watchedAt: new Date(2024, 0, 5),
      ordinal: 1,
      movieProviderId: 999999,
    };
    render(
      <ul>
        <DiaryEntryRow entry={entry} />
      </ul>,
    );

    expect(screen.getByText("Title unavailable")).toBeInTheDocument();
    expect(screen.getByText("Movie")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/movies/999999");
  });

  it("renders an unavailable episode entry, still linking to its real season/episode", () => {
    const entry: DiaryEntry = {
      kind: "unavailable",
      eventType: "episode",
      id: "d",
      watchedAt: new Date(2024, 0, 5),
      ordinal: 1,
      showProviderId: 1399,
      seasonNumber: 2,
      episodeNumber: 4,
    };
    render(
      <ul>
        <DiaryEntryRow entry={entry} />
      </ul>,
    );

    expect(screen.getByText("Title unavailable")).toBeInTheDocument();
    expect(screen.getByText("Episode")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/shows/1399/seasons/2#episode-4");
  });

  it("still offers Edit/Delete for an unavailable entry — the event is real even without a title", async () => {
    const entry: DiaryEntry = {
      kind: "unavailable",
      eventType: "movie",
      id: "e",
      watchedAt: new Date(2024, 0, 5),
      ordinal: 1,
      movieProviderId: 999999,
    };
    render(
      <ul>
        <DiaryEntryRow entry={entry} />
      </ul>,
    );

    expect(screen.getByRole("button", { name: /More actions/ })).toBeInTheDocument();
  });
});
