import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveShowContinuation } from "@/server/home/types";
import { FinishSoonRow } from "./finish-soon-row";

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
    watchedEpisodeCount: 8,
    remainingAiredEpisodeCount: 2,
    nextEpisode: {
      seasonNumber: 1,
      episodeNumber: 9,
      episodeProviderId: overrides.showProviderId * 10,
      title: "Episode",
      runtimeMinutes: 40,
    },
    ...overrides,
  };
}

describe("FinishSoonRow", () => {
  it("renders nothing for an empty list", () => {
    const { container } = render(<FinishSoonRow items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows plain remaining-episode copy, no urgency language", () => {
    render(<FinishSoonRow items={[show({ showProviderId: 1, remainingAiredEpisodeCount: 2 })]} />);

    expect(screen.getByText("2 episodes left")).toBeInTheDocument();
    expect(screen.queryByText(/almost there|hurry|last chance/i)).not.toBeInTheDocument();
  });

  it("singularizes a single remaining episode", () => {
    render(<FinishSoonRow items={[show({ showProviderId: 1, remainingAiredEpisodeCount: 1 })]} />);
    expect(screen.getByText("1 episode left")).toBeInTheDocument();
  });

  it("links to the canonical next-episode fragment", () => {
    render(<FinishSoonRow items={[show({ showProviderId: 42, title: "Chernobyl" })]} />);
    const link = screen.getByRole("link", { name: /Finish Chernobyl/ });
    expect(link).toHaveAttribute("href", "/shows/42/seasons/1#episode-9");
  });
});
