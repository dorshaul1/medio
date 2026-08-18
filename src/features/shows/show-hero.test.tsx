import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ShowDetails } from "@/server/media/types";
import { ShowHero } from "./show-hero";

const SHOW: ShowDetails = {
  mediaType: "show",
  id: 1399,
  title: "Game of Thrones",
  originalTitle: "Game of Thrones",
  overview: "Seven noble families fight.",
  tagline: "Winter is coming.",
  firstAirDate: "2011-04-17",
  firstAirYear: 2011,
  lastAirDate: "2019-05-19",
  status: "Ended",
  genres: [
    { id: 18, name: "Drama" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
  ],
  poster: { path: "/got.jpg" },
  backdrop: { path: "/got-backdrop.jpg" },
  providerRating: 8.4,
  voteCount: 21000,
  originalLanguage: "en",
  numberOfSeasons: 8,
  numberOfEpisodes: 73,
  episodeRuntimeMinutes: 60,
  seasons: [],
  creators: [
    { id: 9813, name: "David Benioff" },
    { id: 9814, name: "D.B. Weiss" },
  ],
  nextEpisodeToAir: null,
  lastEpisodeToAir: null,
};

describe("ShowHero", () => {
  it("renders the title as the page's single h1", () => {
    render(<ShowHero show={SHOW} trackingControl={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "Game of Thrones" })).toBeInTheDocument();
  });

  it("renders a closed year range and status for an ended show", () => {
    render(<ShowHero show={SHOW} trackingControl={null} />);
    // Both a mobile-only and a desktop-only metadata line render in the
    // DOM at once (CSS decides which one shows) — see media-detail-hero.tsx.
    expect(screen.getAllByText("2011–2019").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ended").length).toBeGreaterThan(0);
  });

  it("renders an open-ended year range for a returning show", () => {
    render(<ShowHero show={{ ...SHOW, status: "Returning Series" }} trackingControl={null} />);
    expect(screen.getAllByText("2011–present").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Returning Series").length).toBeGreaterThan(0);
  });

  it("renders the show's scale (seasons, episodes, typical runtime)", () => {
    render(<ShowHero show={SHOW} trackingControl={null} />);
    expect(screen.getByText("8 seasons · 73 episodes · ~1h episodes")).toBeInTheDocument();
  });

  it("renders creators, and omits the line when there are none", () => {
    const { rerender } = render(<ShowHero show={SHOW} trackingControl={null} />);
    expect(screen.getByText(/Created by/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "David Benioff" })).toHaveAttribute(
      "href",
      "/people/9813",
    );
    expect(screen.getByRole("link", { name: "D.B. Weiss" })).toHaveAttribute(
      "href",
      "/people/9814",
    );

    rerender(<ShowHero show={{ ...SHOW, creators: [] }} trackingControl={null} />);
    expect(screen.queryByText(/Created by/)).not.toBeInTheDocument();
  });

  it("renders the tracking control slot", () => {
    render(<ShowHero show={SHOW} trackingControl={<button type="button">Watching</button>} />);
    expect(screen.getByRole("button", { name: "Watching" })).toBeInTheDocument();
  });
});
