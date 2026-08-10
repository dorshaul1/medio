import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TastePatternsSection } from "./taste-patterns-section";

describe("TastePatternsSection", () => {
  it("renders nothing when neither pattern is eligible", () => {
    const { container } = render(<TastePatternsSection movieVsShow={null} completion={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("labels the Movie vs Show split with its comparable unit — unique titles", () => {
    render(
      <TastePatternsSection
        movieVsShow={{ moviePercent: 75, showPercent: 25, totalTitles: 8 }}
        completion={null}
      />,
    );
    expect(screen.getByText("75% movies")).toBeInTheDocument();
    expect(screen.getByText("25% shows")).toBeInTheDocument();
    expect(screen.getByText(/8 unique titles/)).toBeInTheDocument();
  });

  it("renders a neutral 'finishes' sentence, never a shaming one", () => {
    render(
      <TastePatternsSection
        movieVsShow={null}
        completion={{
          tendency: "finishes",
          trackedShowCount: 5,
          droppedShowCount: 0,
          onHoldShowCount: 0,
        }}
      />,
    );
    expect(screen.getByText("You usually finish the shows you start.")).toBeInTheDocument();
  });

  it("renders a neutral 'explores' sentence for a high dropped ratio", () => {
    render(
      <TastePatternsSection
        movieVsShow={null}
        completion={{
          tendency: "explores",
          trackedShowCount: 5,
          droppedShowCount: 3,
          onHoldShowCount: 0,
        }}
      />,
    );
    expect(
      screen.getByText("You try a lot of shows, and stick with the ones that click."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/abandon/i)).not.toBeInTheDocument();
  });
});
