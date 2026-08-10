import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SeasonSummary } from "@/server/media/types";
import { SeasonTile } from "./season-tile";

const SEASON: SeasonSummary = {
  id: 3625,
  seasonNumber: 1,
  title: "Season 1",
  overview: "The first season.",
  airDate: "2011-04-17",
  episodeCount: 10,
  poster: { path: "/season1.jpg" },
};

describe("SeasonTile", () => {
  it("links to the canonical season route with an accessible name from its own text", () => {
    render(<SeasonTile showId={1399} season={SEASON} />);

    const link = screen.getByRole("link", { name: "Season 1 2011 · 10 episodes" });
    expect(link).toHaveAttribute("href", "/shows/1399/seasons/1");
  });

  it("links to season 0 correctly for Specials", () => {
    render(
      <SeasonTile
        showId={1399}
        season={{ ...SEASON, seasonNumber: 0, title: "Specials", episodeCount: 5 }}
      />,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/shows/1399/seasons/0");
  });

  it("omits the air year when unknown, rather than a placeholder", () => {
    render(<SeasonTile showId={1399} season={{ ...SEASON, airDate: null }} />);
    expect(screen.getByRole("link", { name: "Season 1 10 episodes" })).toBeInTheDocument();
  });

  it("renders a fallback instead of an image when there's no season poster", () => {
    render(<SeasonTile showId={1399} season={{ ...SEASON, poster: null }} />);
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });
});
