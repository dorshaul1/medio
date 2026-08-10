import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MovieDiaryEntry } from "@/server/diary/types";
import { DiaryMovieEntry } from "./diary-movie-entry";

vi.mock("@/features/movies/movie-tracking-actions", () => ({
  removeMovieWatchEventAction: vi.fn(),
  updateMovieWatchedAtAction: vi.fn(),
}));
vi.mock("@/features/shows/show-tracking-actions", () => ({
  removeEpisodeWatchEventAction: vi.fn(),
  updateEpisodeWatchedAtAction: vi.fn(),
}));

function entry(overrides: Partial<MovieDiaryEntry> = {}): MovieDiaryEntry {
  return {
    kind: "movie",
    id: "event-1",
    watchedAt: new Date(2024, 0, 5),
    ordinal: 1,
    movieProviderId: 550,
    title: "Fight Club",
    year: 1999,
    poster: null,
    ...overrides,
  };
}

describe("DiaryMovieEntry", () => {
  it("links to the movie's own detail page with the title as accessible content", () => {
    render(
      <ul>
        <DiaryMovieEntry entry={entry()} />
      </ul>,
    );

    const link = screen.getByRole("link", { name: /Fight Club/ });
    expect(link).toHaveAttribute("href", "/movies/550");
  });

  it("shows the release year, not a rewatch label, for a first viewing", () => {
    render(
      <ul>
        <DiaryMovieEntry entry={entry({ ordinal: 1 })} />
      </ul>,
    );

    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.queryByText(/watch$/)).not.toBeInTheDocument();
  });

  it("shows an ordinal rewatch label from the 2nd viewing onward", () => {
    render(
      <ul>
        <DiaryMovieEntry entry={entry({ ordinal: 3 })} />
      </ul>,
    );

    expect(screen.getByText("1999 · 3rd watch")).toBeInTheDocument();
  });

  it("offers a contextual menu naming the movie", () => {
    render(
      <ul>
        <DiaryMovieEntry entry={entry()} />
      </ul>,
    );

    expect(screen.getByRole("button", { name: "More actions for Fight Club" })).toBeInTheDocument();
  });
});
