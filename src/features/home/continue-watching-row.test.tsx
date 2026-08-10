import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveShowContinuation } from "@/server/home/types";
import { ContinueWatchingRow } from "./continue-watching-row";

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

function show(
  overrides: Partial<ActiveShowContinuation> & { showProviderId: number },
): ActiveShowContinuation {
  return {
    title: `Show ${overrides.showProviderId}`,
    poster: null,
    backdrop: null,
    year: 2020,
    lastActivityAt: new Date(),
    airedEpisodeCount: 10,
    watchedEpisodeCount: 4,
    remainingAiredEpisodeCount: 6,
    nextEpisode: {
      seasonNumber: 2,
      episodeNumber: 3,
      episodeProviderId: overrides.showProviderId * 10,
      title: "Episode",
      runtimeMinutes: 40,
    },
    ...overrides,
  };
}

describe("ContinueWatchingRow", () => {
  it("renders nothing for an empty list", () => {
    const { container } = render(<ContinueWatchingRow items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a tile per show with its next-episode coordinate", () => {
    render(<ContinueWatchingRow items={[show({ showProviderId: 1, title: "Stranger Things" })]} />);

    expect(screen.getByRole("heading", { name: "Continue Watching" })).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: "Continue Stranger Things, season 2 episode 3",
    });
    expect(link).toHaveAttribute("href", "/shows/1/seasons/2#episode-3");
    expect(screen.getByText("S2 E3")).toBeInTheDocument();
  });

  it("renders one tile per show, in the given order", () => {
    render(
      <ContinueWatchingRow
        items={[
          show({ showProviderId: 1, title: "Show One" }),
          show({ showProviderId: 2, title: "Show Two" }),
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
