import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MovieDetails, Trailer } from "@/server/media/types";
import type { MovieWatchSummary } from "@/server/tracking/types";
import { MovieHero } from "./movie-hero";

vi.mock("@/features/media/comment-actions", () => ({
  setMediaCommentAction: vi.fn(),
  clearMediaCommentAction: vi.fn(),
}));

// MovieTrackingControl's Server Actions aren't exercised by these tests
// (no interaction is simulated) — mocked so importing them never risks
// touching `next/cache`/the real tracking domain outside a Next request.
vi.mock("./movie-tracking-actions", () => ({
  markMovieWatchedAction: vi.fn(),
  removeMovieWatchEventAction: vi.fn(),
}));
vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: vi.fn(),
  removePlanningItemAction: vi.fn(),
}));

const MOVIE: MovieDetails = {
  mediaType: "movie",
  id: 27205,
  title: "Inception",
  originalTitle: "Inception",
  overview: "A thief who steals corporate secrets.",
  tagline: "Your mind is the scene of the crime.",
  releaseDate: "2010-07-15",
  releaseYear: 2010,
  runtimeMinutes: 148,
  status: "Released",
  genres: [
    { id: 28, name: "Action" },
    { id: 878, name: "Science Fiction" },
  ],
  poster: { path: "/poster.jpg" },
  backdrop: { path: "/backdrop.jpg" },
  providerRating: 8.4,
  voteCount: 35000,
  originalLanguage: "en",
  productionCountries: [{ code: "US", name: "United States of America" }],
  collection: null,
};

const TRAILER: Trailer = { key: "abc123", name: "Official Trailer" };
const UNWATCHED: MovieWatchSummary = { hasWatched: false, watchCount: 0, lastWatchedAt: null };

describe("MovieHero", () => {
  it("renders the title as the page's single h1", () => {
    render(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Inception" })).toBeInTheDocument();
  });

  it("renders the tagline, year, formatted runtime, rating, and genres", () => {
    render(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByText("Your mind is the scene of the crime.")).toBeInTheDocument();
    expect(screen.getByText("2010")).toBeInTheDocument();
    expect(screen.getByText("2h 28m")).toBeInTheDocument();
    expect(screen.getByText("8.4")).toBeInTheDocument();
    expect(screen.getByText("Action, Science Fiction")).toBeInTheDocument();
  });

  it("renders a director line when directors are known, and omits it otherwise", () => {
    const { rerender } = render(
      <MovieHero
        movie={MOVIE}
        directors={[{ id: 525, name: "Christopher Nolan" }]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByText(/Directed by/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Christopher Nolan" })).toHaveAttribute(
      "href",
      "/people/525",
    );

    rerender(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.queryByText(/Directed by/)).not.toBeInTheDocument();
  });

  it("shows a trailer button only when a trailer exists", () => {
    const { rerender } = render(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.queryByRole("button", { name: "Play trailer" })).not.toBeInTheDocument();

    rerender(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={TRAILER}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByRole("button", { name: "Play trailer" })).toBeInTheDocument();
  });

  it("shows the tracking control's unwatched state by default", () => {
    render(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByRole("button", { name: "Mark watched" })).toBeInTheDocument();
  });

  it("shows the tracking control's watched state when already watched", () => {
    render(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={{ hasWatched: true, watchCount: 2, lastWatchedAt: new Date("2024-01-01") }}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByRole("button", { name: /Watched 2 times/ })).toBeInTheDocument();
  });

  it("omits optional metadata cleanly rather than showing placeholders", () => {
    render(
      <MovieHero
        movie={{
          ...MOVIE,
          tagline: null,
          releaseYear: null,
          runtimeMinutes: null,
          providerRating: 0,
          genres: [],
        }}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Inception" })).toBeInTheDocument();
    expect(screen.queryByText("2010")).not.toBeInTheDocument();
  });

  it("renders a poster fallback instead of an image when there's no poster", () => {
    render(
      <MovieHero
        movie={{ ...MOVIE, poster: null, backdrop: null }}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });

  it("offers a Save (planning) control for an unwatched movie", () => {
    render(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByRole("button", { name: "Save Inception to Watchlist" })).toBeInTheDocument();
  });

  it("reflects an existing planning intent on the Save control", () => {
    render(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent="backlog"
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByRole("button", { name: "Backlog" })).toBeInTheDocument();
  });

  it("hides the planning control once the movie has been watched", () => {
    render(
      <MovieHero
        movie={MOVIE}
        directors={[]}
        trailer={null}
        watchSummary={{ hasWatched: true, watchCount: 1, lastWatchedAt: new Date("2024-01-01") }}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.queryByRole("button", { name: /Save Inception/ })).not.toBeInTheDocument();
  });

  it("shows Not yet released instead of a watch control for an unreleased movie", () => {
    render(
      <MovieHero
        movie={{ ...MOVIE, releaseDate: "2099-01-01", releaseYear: 2099 }}
        directors={[]}
        trailer={null}
        watchSummary={UNWATCHED}
        watchEvents={[]}
        planningIntent={null}
        comment={null}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByText("Not yet released")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark watched" })).not.toBeInTheDocument();
    // Planning (Save/Watchlist) still makes sense for something not out yet.
    expect(screen.getByRole("button", { name: "Save Inception to Watchlist" })).toBeInTheDocument();
  });
});
