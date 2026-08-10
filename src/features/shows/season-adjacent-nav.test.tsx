import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SeasonSummary } from "@/server/media/types";
import { SeasonAdjacentNav } from "./season-adjacent-nav";

function season(overrides: Partial<SeasonSummary>): SeasonSummary {
  return {
    id: 1,
    seasonNumber: 1,
    title: "Season 1",
    overview: "",
    airDate: null,
    episodeCount: 10,
    poster: null,
    ...overrides,
  };
}

const SEASONS: SeasonSummary[] = [
  season({ id: 1, seasonNumber: 1, title: "Season 1" }),
  season({ id: 2, seasonNumber: 2, title: "Season 2" }),
  season({ id: 0, seasonNumber: 0, title: "Specials" }),
];

describe("SeasonAdjacentNav", () => {
  it("links Next to the following season in display order", () => {
    render(<SeasonAdjacentNav showId={1399} sortedSeasons={SEASONS} currentSeasonNumber={1} />);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/shows/1399/seasons/2",
    );
  });

  it("disables Previous on the first season in display order", () => {
    render(<SeasonAdjacentNav showId={1399} sortedSeasons={SEASONS} currentSeasonNumber={1} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("Next from the last regular season goes to Specials, matching display order", () => {
    render(<SeasonAdjacentNav showId={1399} sortedSeasons={SEASONS} currentSeasonNumber={2} />);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/shows/1399/seasons/0",
    );
  });

  it("disables Next on the last season in display order (Specials)", () => {
    render(<SeasonAdjacentNav showId={1399} sortedSeasons={SEASONS} currentSeasonNumber={0} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
