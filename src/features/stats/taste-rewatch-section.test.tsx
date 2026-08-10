import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RewatchInsights } from "@/server/stats/types";
import { TasteRewatchSection } from "./taste-rewatch-section";

const EMPTY: RewatchInsights = {
  mostRewatchedMovie: null,
  mostRevisitedShow: null,
  rewatchRatePercent: null,
};

describe("TasteRewatchSection", () => {
  it("renders nothing when there is no real rewatch evidence", () => {
    const { container } = render(<TasteRewatchSection rewatch={EMPTY} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the most rewatched movie with real artwork linking to its detail page", () => {
    render(
      <TasteRewatchSection
        rewatch={{
          ...EMPTY,
          mostRewatchedMovie: {
            mediaProviderId: 550,
            title: "Fight Club",
            poster: null,
            watchCount: 4,
          },
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /Fight Club/ })).toHaveAttribute("href", "/movies/550");
    expect(screen.getByText("Watched 4 times")).toBeInTheDocument();
  });

  it("shows the most revisited show", () => {
    render(
      <TasteRewatchSection
        rewatch={{
          ...EMPTY,
          mostRevisitedShow: {
            mediaProviderId: 1399,
            title: "Winter's Watch",
            poster: null,
            rewatchedEpisodeCount: 5,
          },
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /Winter's Watch/ })).toHaveAttribute(
      "href",
      "/shows/1399",
    );
    expect(screen.getByText("5 episode rewatches")).toBeInTheDocument();
  });

  it("shows the rewatch rate as a clearly explained sentence, not a bare number", () => {
    render(<TasteRewatchSection rewatch={{ ...EMPTY, rewatchRatePercent: 25 }} />);
    expect(screen.getByText(/25%/)).toBeInTheDocument();
    expect(screen.getByText(/of what you've watched/)).toBeInTheDocument();
  });
});
