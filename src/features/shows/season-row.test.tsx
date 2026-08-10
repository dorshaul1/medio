import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SeasonSummary } from "@/server/media/types";
import { SeasonRow } from "./season-row";

// MediaRowScroller (rendered inside) needs ResizeObserver — see its own
// test file for why this is stubbed locally rather than in test/setup.ts.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function season(overrides: Partial<SeasonSummary>): SeasonSummary {
  return {
    id: 1,
    seasonNumber: 1,
    title: "Season 1",
    overview: "",
    airDate: "2011-04-17",
    episodeCount: 10,
    poster: null,
    ...overrides,
  };
}

describe("SeasonRow", () => {
  it("renders a heading and every season, sorted", () => {
    render(
      <SeasonRow
        showId={1399}
        seasons={[
          season({ id: 2, seasonNumber: 2, title: "Season 2" }),
          season({ id: 1, seasonNumber: 1, title: "Season 1" }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Seasons" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/shows/1399/seasons/1");
    expect(links[1]).toHaveAttribute("href", "/shows/1399/seasons/2");
  });

  it("renders nothing when there are no displayable seasons", () => {
    const { container } = render(
      <SeasonRow showId={1399} seasons={[season({ episodeCount: 0 })]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
